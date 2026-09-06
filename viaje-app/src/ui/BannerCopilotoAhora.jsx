import { useNavigate } from 'react-router'
import Icon from './Icon.jsx'
import './banner-copiloto-ahora.css'

export default function BannerCopilotoAhora() {
  const navegar = useNavigate()

  return (
    <div className="ahora-copilot-banner-wrapper">
      <div
        className="ahora-copilot-banner"
        role="button"
        tabIndex={0}
        onClick={() => navegar('/copiloto')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navegar('/copiloto') }}
        aria-label="Abrir Copiloto IA"
      >
        <div className="ahora-copilot-left">
          <div className="ahora-copilot-icon-box">
            <Icon name="sparkles" size={18} className="ahora-copilot-spin-icon" />
          </div>
          <div className="ahora-copilot-txt">
            <div className="ahora-copilot-head">
              <span className="ahora-copilot-title">Copiloto IA</span>
              <span className="ahora-copilot-badge">
                <span className="ahora-copilot-dot" />
                <span>En curso</span>
              </span>
            </div>
            <p className="ahora-copilot-sub">
              Supervisando clima, aforos en directo y accesibilidad familiar...
            </p>
          </div>
        </div>

        <div className="ahora-copilot-action">
          <span className="ahora-copilot-action-btn">
            <span>Consultar</span>
            <Icon name="arrow-right" size={14} />
          </span>
        </div>
      </div>
    </div>
  )
}
