from http.server import BaseHTTPRequestHandler
import json
import numpy as np

# ─── DATOS HISTÓRICOS DE REFERENCIA (benchmarks de agencia digital) ───────────
# Cada fila: [ingresos, leads, proyectos, score, ticket_promedio, conversion_rate]
HISTORICAL_DATA = [
    # Meses de "Alto Rendimiento"
    [22000, 68, 18, 91, 850, 35.2],
    [19500, 72, 16, 88, 780, 33.1],
    [25000, 80, 20, 94, 920, 38.0],
    [21000, 65, 17, 89, 810, 34.5],
    # Meses de "Crecimiento Estable"
    [14000, 48, 12, 76, 640, 26.8],
    [16000, 52, 13, 79, 680, 28.4],
    [15500, 45, 11, 74, 660, 25.9],
    [13000, 50, 10, 72, 610, 27.0],
    # Meses de "Atención Requerida"
    [7000,  28,  5, 54, 420, 14.2],
    [5500,  20,  4, 48, 380, 12.8],
    [8000,  32,  6, 58, 450, 16.0],
    [6200,  24,  5, 51, 395, 13.5],
]

CLUSTER_NAMES = ["Alto Rendimiento", "Crecimiento Estable", "Atención Requerida"]
CLUSTER_COLORS = ["#22c55e", "#f59e0b", "#ef4444"]
CLUSTER_ICONS  = ["🚀", "📈", "⚠️"]

# ─── K-MEANS MANUAL (sin dependencia externa, puro numpy) ─────────────────────
def normalize(data):
    data = np.array(data, dtype=float)
    mins = data.min(axis=0)
    maxs = data.max(axis=0)
    ranges = maxs - mins
    ranges[ranges == 0] = 1  # evitar división por cero
    return (data - mins) / ranges, mins, maxs, ranges

def kmeans(data, k=3, iterations=100, seed=42):
    rng = np.random.default_rng(seed)
    # Inicializar centroids en índices distribuidos uniformemente
    idx = np.linspace(0, len(data) - 1, k, dtype=int)
    centroids = data[idx].copy()

    labels = np.zeros(len(data), dtype=int)
    for _ in range(iterations):
        # Asignar clusters
        dists = np.array([[np.linalg.norm(p - c) for c in centroids] for p in data])
        new_labels = dists.argmin(axis=1)
        if np.array_equal(new_labels, labels):
            break
        labels = new_labels
        # Recalcular centroids
        for i in range(k):
            members = data[labels == i]
            if len(members) > 0:
                centroids[i] = members.mean(axis=0)
    return labels, centroids

def compute_cluster_quality(features_norm, label, centroid):
    """Calcula qué tan cerca está el punto de su centroid (0-100)."""
    dist = np.linalg.norm(features_norm - centroid)
    max_dist = np.sqrt(len(features_norm))  # distancia máxima posible en espacio normalizado
    quality = max(0, 100 - (dist / max_dist) * 100)
    return round(quality, 1)

# ─── HANDLER ──────────────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            # ── Extraer métricas del mes actual ──────────────────────────────
            summary = data.get('summary', {})
            ventas  = data.get('ventas', {})
            leads_d = data.get('leads', {})

            current = [
                float(summary.get('total_revenue', 0)),
                float(summary.get('total_leads', 0)),
                float(summary.get('total_projects', 0)),
                float(summary.get('health_score', 0)),
                float(ventas.get('ticket_promedio', 0)),
                float(leads_d.get('conversion_rate', 0)),
            ]

            # ── Combinar histórico + mes actual ──────────────────────────────
            all_data = HISTORICAL_DATA + [current]
            all_data_np = np.array(all_data, dtype=float)

            # ── Normalizar ───────────────────────────────────────────────────
            norm_data, mins, maxs, ranges = normalize(all_data_np)

            # ── K-Means ──────────────────────────────────────────────────────
            labels, centroids = kmeans(norm_data, k=3)

            # El último punto es el mes actual
            current_idx    = len(all_data) - 1
            current_label  = int(labels[current_idx])
            current_norm   = norm_data[current_idx]
            current_centroid = centroids[current_label]

            quality = compute_cluster_quality(current_norm, current_label, current_centroid)

            # ── Preparar puntos 3D para el gráfico ───────────────────────────
            # Ejes: X=ingresos, Y=leads, Z=score
            points = []
            for i, (row, lbl) in enumerate(zip(all_data, labels)):
                is_current = (i == current_idx)
                points.append({
                    "x": float(row[0]),
                    "y": float(row[1]),
                    "z": float(row[3]),
                    "ticket":     float(row[4]),
                    "conversion": float(row[5]),
                    "cluster":    int(lbl),
                    "is_current": is_current,
                    "label": "📍 Mayo 2026" if is_current else f"Mes {i+1}",
                })

            # ── Insights automáticos ──────────────────────────────────────────
            insights = _generate_insights(current, current_label, summary, ventas, leads_d)

            # ── Comparativa vs cluster ────────────────────────────────────────
            cluster_members = [all_data[i] for i, l in enumerate(labels)
                               if l == current_label and i != current_idx]
            cluster_avg = np.mean(cluster_members, axis=0).tolist() if cluster_members else current

            # ── Respuesta ────────────────────────────────────────────────────
            response = {
                "status":          "success",
                "cluster_assigned": current_label,
                "cluster_name":    CLUSTER_NAMES[current_label],
                "cluster_color":   CLUSTER_COLORS[current_label],
                "cluster_icon":    CLUSTER_ICONS[current_label],
                "quality_score":   quality,
                "points":          points,
                "cluster_names":   CLUSTER_NAMES,
                "cluster_colors":  CLUSTER_COLORS,
                "insights":        insights,
                "cluster_avg": {
                    "ingresos":    round(cluster_avg[0]),
                    "leads":       round(cluster_avg[1]),
                    "proyectos":   round(cluster_avg[2]),
                    "score":       round(cluster_avg[3], 1),
                    "ticket":      round(cluster_avg[4]),
                    "conversion":  round(cluster_avg[5], 1),
                },
                "current": {
                    "ingresos":    current[0],
                    "leads":       current[1],
                    "proyectos":   current[2],
                    "score":       current[3],
                    "ticket":      current[4],
                    "conversion":  current[5],
                },
            }

            self._respond(200, response)

        except Exception as e:
            self._respond(500, {"status": "error", "message": str(e)})

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _respond(self, code, payload):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def log_message(self, format, *args):
        pass  # silenciar logs en Vercel


def _generate_insights(current, cluster_label, summary, ventas, leads_d):
    insights = []
    ingresos, leads, proyectos, score, ticket, conv = current

    # Insight 1: Health Score
    if score >= 85:
        insights.append({"type": "success", "icon": "🏆", "title": "Salud Excelente",
                         "text": f"Tu health score de {score} supera el umbral óptimo (85+). Mantén el ritmo."})
    elif score >= 70:
        insights.append({"type": "warning", "icon": "📊", "title": "Salud Buena",
                         "text": f"Score {score}/100. Hay margen para mejorar: enfócate en cobranza y conversión."})
    else:
        insights.append({"type": "danger", "icon": "🚨", "title": "Salud Crítica",
                         "text": f"Score {score}/100. Prioriza urgentemente: recupera cartera vencida y activa leads fríos."})

    # Insight 2: Conversión de leads
    cohorte = leads_d.get('cohorte', {})
    lead_to_project = cohorte.get('conversion_lead_a_proyecto_pct', 0)
    if lead_to_project < 30:
        insights.append({"type": "danger", "icon": "🔴", "title": "Conversión Baja",
                         "text": f"Solo {lead_to_project}% de leads se convierten en proyectos. Revisa tu proceso de cierre."})
    elif lead_to_project >= 50:
        insights.append({"type": "success", "icon": "✅", "title": "Conversión Sólida",
                         "text": f"{lead_to_project}% de leads → proyectos. Excelente calidad de pipeline."})
    else:
        insights.append({"type": "info", "icon": "💡", "title": "Conversión Moderada",
                         "text": f"{lead_to_project}% conversión lead→proyecto. El benchmark del cluster es 40%+."})

    # Insight 3: Cluster específico
    if cluster_label == 0:
        insights.append({"type": "success", "icon": "🚀", "title": "Mejor del Cluster",
                         "text": "Estás en el grupo de Alto Rendimiento. Documenta qué estás haciendo bien y escala."})
    elif cluster_label == 1:
        insights.append({"type": "info", "icon": "📈", "title": "Crecimiento Estable",
                         "text": "Estás en trayectoria de crecimiento. Un 20% más en leads te llevaría a Alto Rendimiento."})
    else:
        insights.append({"type": "danger", "icon": "⚠️", "title": "Acción Inmediata",
                         "text": "Este cluster requiere intervención. Enfócate en 3 acciones: activar leads, cobrar pendientes, reactivar proyectos pausados."})

    return insights
