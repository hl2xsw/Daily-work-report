import { WorkReportItem } from '../types';

const generateInitialReports = (): WorkReportItem[] => {
  const teamsData = [
    {
      team: '그리드팀',
      members: [
        { name: '김철수 팀장', role: '리더' },
        { name: '이영희 수석', role: '전력망' },
        { name: '박민수 책임', role: '제어기' },
        { name: '정우성 선임', role: '데이터' },
      ],
      tasks: [
        { today: '스마트그리드 전력 분배 알고리즘 1차 수집', result: '완료', tomorrow: '2차 실시간 전력 피크치 모니터링', status: '완료', issue: '특이사항 없음' },
        { today: '배전 모듈 센서 전압 테스트 및 오차 측정', result: '진행중 (80%)', tomorrow: '센서 노이즈 필터링 튜닝', status: '진행중', issue: '일부 구형 센서 응답시간 50ms 지연' },
        { today: '분산 전원 연계 안전 가이드라인 검토', result: '완료', tomorrow: '현장 안전 점검 보고서 작성', status: '완료', issue: '특이사항 없음' },
        { today: '그리드 모니터링 대시보드 API 최적화', result: '진행중 (60%)', tomorrow: '쿼리 인덱싱 추가 및 응답속도 개선', status: '진행중', issue: 'DB 트래픽 과다로 응답시간 지연' },
      ],
    },
    {
      team: '개발팀',
      members: [
        { name: '최재훈 팀장', role: '개발총괄' },
        { name: '강지은 수석', role: '백엔드' },
        { name: '윤성호 책임', role: '프론트엔드' },
        { name: '한소희 선임', role: 'QA' },
      ],
      tasks: [
        { today: 'EV 스마트 충전 통합 백엔드 API 개발', result: '완료', tomorrow: '충전소 결제 모듈 부하 테스트', status: '완료', issue: '특이사항 없음' },
        { today: '모바일 앱 사용자 인증 OAuth 토큰 갱신 로직 구현', result: '완료', tomorrow: '보안 서버 2차 패치 적용', status: '완료', issue: '특이사항 없음' },
        { today: '실시간 업무일지 통계 시각화 차트 컴포넌트 개발', result: '진행중 (90%)', tomorrow: '반응형 레이아웃 튜닝 및 QA', status: '진행중', issue: 'iOS 사파리 UI 여백 미세 조율 필요' },
        { today: '충전소 실시간 데이터 파이프라인 버그 수정', result: '지연', tomorrow: '로그 분석 및 소켓 재연결 스크립트 수정', status: '지연', issue: '외부 API 파서 타임아웃 오류 발생' },
      ],
    },
    {
      team: '운영팀',
      members: [
        { name: '임동현 팀장', role: '운영총괄' },
        { name: '서유진 수석', role: '관제' },
        { name: '오상진 책임', role: '고객지원' },
        { name: '배수지 선임', role: '품질' },
      ],
      tasks: [
        { today: '전국 충전소 스테이션 24시간 일일 관제 현황 점검', result: '완료', tomorrow: '신규 설치 스테이션 네트워크 동기화', status: '완료', issue: '대구 3번 충전기 모듈 일시 정지 후 복구' },
        { today: '고객 센터 문의 케이스 분석 및 FAQ 업데이트', result: '완료', tomorrow: '운영 상담 가이드 재배포', status: '완료', issue: '특이사항 없음' },
        { today: '주간 충전소 이용률 및 전력 소비량 집계 보고서 작성', result: '진행중 (70%)', tomorrow: '경영진 보고 제출', status: '진행중', issue: '특이사항 없음' },
        { today: '가동 중단 충전기 현장 출동 정기 수리', result: '완료', tomorrow: '부품 재고 현황 파악', status: '완료', issue: '예비 부품 수급 1일 지연 예정' },
      ],
    },
    {
      team: '인프라팀',
      members: [
        { name: '송민준 팀장', role: '인프라총괄' },
        { name: '권아름 수석', role: '클라우드' },
        { name: '장동건 책임', role: '네트워크' },
        { name: '김태희 선임', role: '보안' },
      ],
      tasks: [
        { today: '클라우드 서버 인스턴스 자동 스케일링 설정 점검', result: '완료', tomorrow: '쿠버네티스 노드 오토스케일러 테스트', status: '완료', issue: '특이사항 없음' },
        { today: '방화벽 보안 정책 업데이트 및 침입 탐지 시스템 점검', result: '완료', tomorrow: '보안 취약점 8월 2차 스캔', status: '완료', issue: '특이사항 없음' },
        { today: '데이터베이스 정기 백업 및 이중화 스토리지 복구 테스트', result: '진행중 (85%)', tomorrow: '스토리지 백업 보완 및 압축률 확인', status: '진행중', issue: '백업 전송 중 네트워크 대역폭 폭증' },
        { today: '사내 개발 서버 OS 보완 패치 수행', result: '완료', tomorrow: '개발팀 개발 환경 정상작동 점검', status: '완료', issue: '특이사항 없음' },
      ],
    },
  ];

  const dates = [
    { date: '2026-08-12', display: '2026년 08월 12일', code: '260812' },
    { date: '2026-08-11', display: '2026년 08월 11일', code: '260811' },
    { date: '2026-08-10', display: '2026년 08월 10일', code: '260810' },
    { date: '2026-08-08', display: '2026년 08월 08일', code: '260808' },
    { date: '2026-08-07', display: '2026년 08월 07일', code: '260807' },
    { date: '2026-08-06', display: '2026년 08월 06일', code: '260806' },
    { date: '2026-08-05', display: '2026년 08월 05일', code: '260805' },
    { date: '2026-08-04', display: '2026년 08월 04일', code: '260804' },
    { date: '2026-08-03', display: '2026년 08월 03일', code: '260803' },
    { date: '2026-08-01', display: '2026년 08월 01일', code: '260801' },
  ];

  const reports: WorkReportItem[] = [];

  dates.forEach((dObj, dIdx) => {
    teamsData.forEach((teamObj) => {
      teamObj.members.forEach((m, mIdx) => {
        const taskObj = teamObj.tasks[(dIdx + mIdx) % teamObj.tasks.length];
        
        // Vacation logic
        let isVacationToday = false;
        let vacationTypeToday = undefined;
        let isVacationTomorrow = false;
        let vacationTypeTomorrow = undefined;
        let todayTask = taskObj.today;
        let tomorrowTask = taskObj.tomorrow;
        let remarks = '정상근무';

        // Introduce deterministic vacations
        if ((dIdx * 3 + mIdx) % 11 === 0) {
          isVacationToday = true;
          vacationTypeToday = '연차';
          todayTask = '금일 연차 휴가';
          remarks = '금일 휴가 (연차)';
        } else if ((dIdx * 3 + mIdx) % 13 === 0) {
          isVacationToday = true;
          vacationTypeToday = '오후반차';
          todayTask = `${taskObj.today} (오전 근무 후 오후 반차)`;
          remarks = '금일 오후반차';
        } else if ((dIdx * 3 + mIdx) % 17 === 0) {
          isVacationTomorrow = true;
          vacationTypeTomorrow = '연차';
          tomorrowTask = '익일 연차 휴가 예정';
          remarks = '익일 휴가 (연차) 예정';
        }

        const sourceFileName = `${dObj.code} ${teamObj.team} 업무 공유.xlsx`;

        reports.push({
          id: `sample-demo-${dObj.date}-${teamObj.team}-${m.name.replace(/\s+/g, '')}-${dIdx}-${mIdx}`,
          isSample: true,
          date: dObj.date,
          displayDate: dObj.display,
          department: 'EV Innovation 부문',
          team: teamObj.team,
          author: m.name,
          todayTask,
          taskResult: isVacationToday && vacationTypeToday === '연차' ? '완료' : taskObj.result,
          tomorrowTask,
          status: isVacationToday && vacationTypeToday === '연차' ? '완료' : (taskObj.status as any),
          issues: taskObj.issue,
          remarks,
          isVacationToday,
          vacationTypeToday,
          isVacationTomorrow,
          vacationTypeTomorrow,
          sourceFileName,
          updatedAt: new Date().toISOString(),
        });
      });
    });
  });

  return reports;
};

export const initialSampleReports: WorkReportItem[] = generateInitialReports().slice(0, 92);
