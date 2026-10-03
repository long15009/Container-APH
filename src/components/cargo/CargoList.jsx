import CargoForm from './CargoForm.jsx';
import CargoListItem from './CargoListItem.jsx';

export default function CargoList({ cargoList, editingId, onStartEdit, onCancelEdit, onUpdate, onDelete }) {
  if (cargoList.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {cargoList.map((cargo) => (
        <li key={cargo.id}>
          {editingId === cargo.id ? (
            <div className="rounded-md border border-blue-300 bg-blue-50/50 p-2">
              <CargoForm
                initialCargo={cargo}
                defaultName={cargo.name}
                color={cargo.color}
                submitLabel="Lưu thay đổi"
                onSubmit={(values) => onUpdate(cargo.id, values)}
                onCancel={onCancelEdit}
              />
            </div>
          ) : (
            <CargoListItem cargo={cargo} onEdit={() => onStartEdit(cargo.id)} onDelete={() => onDelete(cargo.id)} />
          )}
        </li>
      ))}
    </ul>
  );
}
