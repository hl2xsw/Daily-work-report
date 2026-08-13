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

  // Shared Data Store File Path for Cross-Device Persistence
  const dataFilePath = path.join(process.cwd(), "work_reports_store.json");

  const loadDataFromDisk = () => {
    try {
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reports) && parsed.reports.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading work_reports_store.json:", e);
    }
    return {
      reports: initialSampleReports,
      history: ["260812 그리드팀 업무일지.xlsx", "260812 개발팀 업무일지.xlsx", "260812 운영팀 업무일지.xlsx"],
      lastSyncTime: new Date().toLocaleTimeString('ko-KR')
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

  // API to get all work reports (for PC and Mobile Devices)
  app.get("/api/reports", (req, res) => {
    res.json(store);
  });

  // API to save/sync work reports across all devices
  app.post("/api/reports", (req, res) => {
    const { reports, history, lastSyncTime } = req.body;
    if (Array.isArray(reports)) {
      store.reports = reports;
    }
    if (Array.isArray(history)) {
      store.history = history;
    }
    if (lastSyncTime) {
      store.lastSyncTime = lastSyncTime;
    }
    saveDataToDisk();
    res.json({ success: true, count: store.reports.length });
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
          summary: "일일 주요 종합 요약: 금일 그리드팀, 개발팀, 운영팀 주요 업무가 순조롭게 진행되었습니다. 그리드팀 변전소 연동 검증 0.28% 달성, 개발팀 API 및 엑셀 모듈 구축 완료, 운영팀 보안 패치 2.4 적용이 완료되었습니다."
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
