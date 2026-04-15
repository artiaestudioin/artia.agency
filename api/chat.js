// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // El modelo rápido de Groq
        messages: [
          { 
            role: 'system', 
            content: 'Eres el asistente virtual de Artia Studio. Eres creativo, profesional y experto en marketing y audiovisual. Ayuda a los clientes con dudas sobre fotografía, branding y diseño.' 
          },
          ...messages
        ],
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con la IA' });
  }
}