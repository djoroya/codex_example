import React, { useMemo, useRef, useState, useEffect } from "react";

const DEFAULT_EQUATIONS = {
  dx: "y",
  dy: "-x"
};

const COLORS = [
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#f97316",
  "#7c3aed",
  "#0ea5e9"
];

const createEvaluator = (expression) => {
  return new Function("x", "y", `return ${expression}`);
};

const generateRandomCondition = (range) => {
  const value = () => Number((Math.random() * range * 1.6 - range * 0.8).toFixed(2));
  return { x: value(), y: value() };
};

const App = () => {
  const [equations, setEquations] = useState(DEFAULT_EQUATIONS);
  const [draftEquations, setDraftEquations] = useState(DEFAULT_EQUATIONS);
  const [conditions, setConditions] = useState([{ x: 1, y: 0 }]);
  const [settings, setSettings] = useState({ dt: 0.02, steps: 2400, range: 5 });
  const [trajectories, setTrajectories] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canvasRef = useRef(null);

  const compiled = useMemo(() => {
    try {
      return {
        dx: createEvaluator(equations.dx),
        dy: createEvaluator(equations.dy)
      };
    } catch (err) {
      return null;
    }
  }, [equations]);

  const simulate = () => {
    if (!compiled) {
      setError("Las ecuaciones no son válidas. Revisa la sintaxis.");
      return;
    }

    try {
      const nextTrajectories = conditions.map((condition) => {
        const points = [{ x: condition.x, y: condition.y }];
        let x = condition.x;
        let y = condition.y;

        for (let i = 0; i < settings.steps; i += 1) {
          const dx = compiled.dx(x, y);
          const dy = compiled.dy(x, y);
          if (!Number.isFinite(dx) || !Number.isFinite(dy)) break;

          x += dx * settings.dt;
          y += dy * settings.dt;
          points.push({ x, y });
        }

        return points;
      });

      setTrajectories(nextTrajectories);
      setError(null);
    } catch (err) {
      setError("Error al evaluar las ecuaciones. Usa expresiones válidas con x e y.");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    const { width, height } = canvas;
    const animationSpeed = 0.02;

    const range = settings.range;
    const scale = width / (range * 2);
    const toCanvas = (point) => ({
      x: width / 2 + point.x * scale,
      y: height / 2 - point.y * scale
    });

    const drawFrame = (time) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let i = -range; i <= range; i += 1) {
        const offset = i * scale;
        ctx.beginPath();
        ctx.moveTo(width / 2 + offset, 0);
        ctx.lineTo(width / 2 + offset, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height / 2 + offset);
        ctx.lineTo(width, height / 2 + offset);
        ctx.stroke();
      }

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      trajectories.forEach((trajectory, index) => {
        if (trajectory.length < 2) return;
        ctx.strokeStyle = COLORS[index % COLORS.length];
        ctx.lineWidth = 2;
        ctx.beginPath();
        const start = toCanvas(trajectory[0]);
        ctx.moveTo(start.x, start.y);
        trajectory.slice(1).forEach((point) => {
          const canvasPoint = toCanvas(point);
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        });
        ctx.stroke();

        const finalPoint = toCanvas(trajectory[trajectory.length - 1]);
        ctx.fillStyle = COLORS[index % COLORS.length];
        ctx.beginPath();
        ctx.arc(finalPoint.x, finalPoint.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      if (trajectories.length > 0) {
        trajectories.forEach((trajectory, index) => {
          if (trajectory.length < 2) return;
          const phase = (time * animationSpeed * (1 + index * 0.25)) % trajectory.length;
          const current = trajectory[Math.floor(phase)];
          const canvasPoint = toCanvas(current);
          ctx.fillStyle = COLORS[index % COLORS.length];
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    const render = (time) => {
      drawFrame(time);
      if (trajectories.length > 0) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [trajectories, settings]);

  const handleConditionChange = (index, key, value) => {
    setConditions((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [key]: Number(value) } : item
      )
    );
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, generateRandomCondition(settings.range)]);
  };

  const removeCondition = (index) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Simulador de ODE bidimensional</h1>
          <p>Explora el diagrama de fases y observa múltiples condiciones de contorno.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => setIsModalOpen(true)}>
            Editar ecuaciones
          </button>
          <button className="primary" onClick={simulate}>
            Simular
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>Condiciones iniciales</h2>
          <div className="conditions">
            {conditions.map((condition, index) => (
              <div className="condition-row" key={`cond-${index}`}>
                <span className="badge">#{index + 1}</span>
                <label>
                  x₀
                  <input
                    type="number"
                    value={condition.x}
                    step="0.1"
                    onChange={(event) =>
                      handleConditionChange(index, "x", event.target.value)
                    }
                  />
                </label>
                <label>
                  y₀
                  <input
                    type="number"
                    value={condition.y}
                    step="0.1"
                    onChange={(event) =>
                      handleConditionChange(index, "y", event.target.value)
                    }
                  />
                </label>
                <button
                  className="ghost"
                  onClick={() => removeCondition(index)}
                  aria-label="Eliminar condición"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button className="icon-button" onClick={addCondition}>
            <span className="icon">＋</span> Agregar condición
          </button>
        </section>

        <section className="panel">
          <h2>Parámetros de simulación</h2>
          <div className="settings">
            <label>
              Paso de tiempo (dt)
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={settings.dt}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, dt: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              Iteraciones
              <input
                type="number"
                min="200"
                step="100"
                value={settings.steps}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, steps: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              Rango del plano (±)
              <input
                type="number"
                min="1"
                step="1"
                value={settings.range}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, range: Number(event.target.value) }))
                }
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="equations-preview">
            <div>
              <span>d x / dt =</span>
              <strong>{equations.dx}</strong>
            </div>
            <div>
              <span>d y / dt =</span>
              <strong>{equations.dy}</strong>
            </div>
          </div>
        </section>

        <section className="panel canvas-panel">
          <h2>Diagrama de fases</h2>
          <p className="hint">Haz clic en simular para actualizar la visualización.</p>
          <canvas ref={canvasRef} width={640} height={480} />
        </section>
      </main>

      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3>Ecuaciones del sistema</h3>
              <button
                className="ghost"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label>
                d x / dt =
                <input
                  type="text"
                  value={draftEquations.dx}
                  onChange={(event) =>
                    setDraftEquations((prev) => ({ ...prev, dx: event.target.value }))
                  }
                />
              </label>
              <label>
                d y / dt =
                <input
                  type="text"
                  value={draftEquations.dy}
                  onChange={(event) =>
                    setDraftEquations((prev) => ({ ...prev, dy: event.target.value }))
                  }
                />
              </label>
              <p className="hint">
                Usa expresiones en términos de <strong>x</strong> e <strong>y</strong>.
                Ejemplo: <code>y - 0.2 * x</code>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="secondary"
                onClick={() => {
                  setDraftEquations(equations);
                  setIsModalOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="primary"
                onClick={() => {
                  setEquations(draftEquations);
                  setIsModalOpen(false);
                }}
              >
                Guardar ecuaciones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
