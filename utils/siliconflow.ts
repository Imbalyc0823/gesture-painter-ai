// src/utils/siliconflow.ts
// src/utils/siliconflow.ts（完整函数，带调试日志）
export const generateWithSiliconFlow = async (base64Image: string): Promise<string> => {
  const API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY;  // 必须用 import.meta.env

  // 加调试日志（浏览器控制台能看到）
  console.log('🔑 SiliconFlow API Key (检查是否 undefined):', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'UNDEFINED!');

  if (!API_KEY || API_KEY === 'undefined' || API_KEY.includes('PLACEHOLDER')) {
    throw new Error(
      'AI 生成失败：未检测到 SiliconFlow API Key\n\n' +
      '1. 确认 Netlify 环境变量：VITE_SILICONFLOW_API_KEY（值是 sk- 开头的密钥，无空格）\n' +
      '2. Scope 选 "All scopes"\n' +
      '3. 手动触发重新部署（Site settings → Deploys → Trigger deploy）\n' +
      '调试提示：打开浏览器 F12 → Console，看 "🔑 SiliconFlow API Key" 日志'
    );
  }
  const url = 'https://api.siliconflow.com/v1/images/generations';

  const payload = {
    model: 'black-forest-labs/FLUX.1-Kontext-dev',
    prompt:
      'Strictly preserve the structure and composition of this sketch. Colorize and render it into a high-quality digital illustration.Maintain the original composition and core subject elements. Transformed into a dynamic, ultra-detailed photograph with exceptional material definition and depth of field.',
    image: base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`,
    strength: 0.82,                 // 0.75~0.85 之间效果最好
    num_inference_steps: 28,
    image_size: '1248x832',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SiliconFlow 请求失败 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data?.data?.[0]?.url) {
    return data.data[0].url;   // SiliconFlow 返回的是公开可访问的图片 URL
  } else {
    throw new Error('SiliconFlow 返回了空图片数据');
  }
};