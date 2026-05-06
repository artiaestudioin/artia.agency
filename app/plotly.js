// Ejemplo de llamada desde tu frontend
const getAnalytics = async (data) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  // Aquí pasas result a tu componente de Plotly 3D
};