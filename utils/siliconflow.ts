// src/utils/siliconflow.ts
export const generateWithSiliconFlow = async (base64Image: string): Promise<string> => {
  const API_KEY = process.env.SILICONFLOW_API_KEY;
  if (!API_KEY || API_KEY.includes('PLACEHOLDER')) {
    throw new Error('请在 .env.local 中配置 SILICONFLOW_API_KEY');
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