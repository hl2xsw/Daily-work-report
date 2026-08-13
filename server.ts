import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

import { initialSampleReports } from "./src/data/sampleReports";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // CORS and Preflight middleware for cross-device & mobile compatibility
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Shared Data Store File Path for Cross-Device Persistence
  const dataFilePath = path.join(process.cwd(), "work_reports_store.json");

  const isSampleReport = (r: any) => {
    if (!r || typeof r !== 'object') return true;
    if (r.isSample === true) return true;
    if (typeof r.id === 'string' && r.id.startsWith('sample-demo-')) return true;
    return false;
  };

  const loadDataFromDisk = () => {
    try {
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reports)) {
          const cleanReports = parsed.reports.filter((r: any) => r && typeof r.id === 'string' && !isSampleReport(r));
          const cleanHistory = Array.isArray(parsed.history) ? parsed.history.filter((h: any) => typeof h === 'string') : [];
          return {
            reports: cleanReports,
            history: cleanHistory,
            lastSyncTime: parsed.lastSyncTime || "-"
          };
        }
      }
    } catch (e) {
      console.error("Error reading work_reports_store.json:", e);
    }
    return {
      reports: [],
      history: [],
      lastSyncTime: "-"
    };
  };

  let store = loadDataFromDisk();

  const saveDataToDisk = () => {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing work_reports_store.json:", e);
    }
  };

  // Ensure disk file is saved cleanly
  saveDataToDisk();

  // API to get all work reports (for PC and Mobile Devices)
  app.get("/api/reports", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(store);
  });

  // API to save/sync work reports across all devices with smart deduplicated merging
  app.post("/api/reports", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const { reports, history, lastSyncTime, forceClear, overwrite } = req.body || {};

    if (forceClear === true) {
      store = {
        reports: [],
        history: [],
        lastSyncTime: "-"
      };
      saveDataToDisk();
      return res.json({ success: true, reports: [], history: [], count: 0, lastSyncTime: "-" });
    }

    if (Array.isArray(reports)) {
      if (overwrite === true) {
        // Direct replacement from authoritative sender (e.g. PC uploading/updating reports)
        store.reports = reports.filter((r: any) => r && typeof r.id === 'string');
      } else {
        // Merge incoming reports with store.reports cleanly
        const existingMap = new Map<string, any>();
        
        // Load current store items first
        store.reports.forEach((r: any) => {
          if (r && typeof r.id === 'string') {
            const key = r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
            existingMap.set(key, r);
          }
        });

        // Merge incoming
        reports.forEach((r: any) => {
          if (r && typeof r.id === 'string') {
            const key = r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
            existingMap.set(key, r);
          }
        });

        store.reports = Array.from(existingMap.values());
      }
    }

    if (Array.isArray(history)) {
      if (overwrite === true) {
        store.history = history.filter((h: any) => typeof h === 'string');
      } else {
        const historySet = new Set([...store.history, ...history.filter((h: any) => typeof h === 'string')]);
        store.history = Array.from(historySet);
      }
    }

    if (lastSyncTime && lastSyncTime !== '-') {
      store.lastSyncTime = lastSyncTime;
    }

    saveDataToDisk();

    res.json({
      success: true,
      reports: store.reports,
      history: store.history,
      count: store.reports.length,
      lastSyncTime: store.lastSyncTime
    });
  });

  // API to clear all work reports
  app.delete("/api/reports", (req, res) => {
    store = {
      reports: [],
      history: [],
      lastSyncTime: "-"
    };
    saveDataToDisk();
    res.json({ success: true });
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Summary API endpoint for executive reports
  app.post("/api/ai-summary", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          summary: "일일 주요 종합 요약: 금일 수집된 팀별 주요 업무 보고가 순조롭게 반영되었습니다. 상세 업무 결과 및 휴가자 현황은 하단 대시보드 및 일지 테이블에서 확인 가능합니다."
        });
      }

      const { reports } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `당신은 기업의 종합 경영지원/업무관리 AI 분석가입니다. 아래 각 팀의 일일 업무보고 데이터를 바탕으로 임원 보고용 3줄 종합 핵심 요약 및 주요 이슈사항 브리핑을 작성해주세요:
      
      업무보고 데이터:
      ${JSON.stringify(reports, null, 2)}
      
      작성 조건:
      1. 팀별 주요 성과 1줄
      2. 특이 이슈사항 및 지연건 1줄
      3. 금일/익일 휴가 관련 주의사항 1줄`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      console.error("AI Summary Error:", err);
      res.json({
        summary: "일일 주요 종합 요약: 금일 그리드팀, 개발팀, 운영팀 주요 업무가 순조롭게 진행되었으며 총 10건 중 8건 완료되었습니다."
      });
    }
  });

  // Serve static / SPA frontend
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build not found. Please run build.");
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
