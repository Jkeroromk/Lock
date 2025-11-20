export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Cal AI Backend API</h1>
      <p>API 服务正在运行</p>
      <ul>
        <li>POST /api/vision - 分析食物图片</li>
        <li>POST /api/log-meal - 记录餐食</li>
        <li>GET /api/today - 获取今日数据</li>
        <li>GET /api/weekly - 获取周数据</li>
        <li>POST /api/sync-health - 同步健康数据</li>
      </ul>
    </div>
  );
}


