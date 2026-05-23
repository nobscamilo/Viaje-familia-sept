import { CircleDollarSign, Plus, X } from 'lucide-react'

export default function PlaceSuggestionModal({
  categoryLabel,
  draft,
  onClose,
  onSubmit,
  onUpdate,
  placeName,
}) {
  return (
    <div
      aria-label="Completar sugerencia"
      aria-modal="true"
      className="add-modal-overlay"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      role="dialog"
    >
      <section className="add-modal place-suggestion-modal">
        <div className="add-modal-header">
          <div>
            <p className="eyebrow">{categoryLabel} · {draft.city}</p>
            <h2>{placeName}</h2>
          </div>
          <button
            aria-label="Cerrar"
            className="add-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <div className="modal-field-row">
            <label className="modal-field">
              <span>Precio total estimado</span>
              <input
                min="0"
                onChange={(event) => onUpdate('priceTotal', event.target.value)}
                placeholder="Opcional"
                type="number"
                value={draft.priceTotal}
              />
            </label>
            <label className="modal-field">
              <span>Precio por persona</span>
              <input
                min="0"
                onChange={(event) => onUpdate('pricePerPerson', event.target.value)}
                placeholder="Opcional"
                type="number"
                value={draft.pricePerPerson}
              />
            </label>
          </div>

          <label className="modal-field">
            <span>Duración u horario</span>
            <input
              onChange={(event) => onUpdate('duration', event.target.value)}
              placeholder="Ej. 2 horas, comida 14:00, mañana tranquila"
              type="text"
              value={draft.duration}
            />
          </label>

          <label className="modal-check">
            <input
              checked={draft.reservationRequired}
              onChange={(event) => onUpdate('reservationRequired', event.target.checked)}
              type="checkbox"
            />
            <span>Requiere reserva o compra anticipada</span>
          </label>

          <label className="modal-field">
            <span>Notas para la familia</span>
            <textarea
              onChange={(event) => onUpdate('notes', event.target.value)}
              placeholder="Qué revisar, por qué encaja, restricciones o dudas."
              rows={3}
              value={draft.notes}
            />
          </label>

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancelar
            </button>
            <button className="login-button" type="submit">
              {draft.includeBudget ? (
                <CircleDollarSign size={16} aria-hidden="true" />
              ) : (
                <Plus size={16} aria-hidden="true" />
              )}
              {draft.includeBudget ? 'Agregar con presupuesto' : 'Agregar al viaje'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
