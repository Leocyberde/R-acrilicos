import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const actions = [
  { id: 'view', label: 'Visualizar' },
  { id: 'create', label: 'Criar' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Excluir' },
];

export default function ModulePermissions({ module, permissions, onChange }) {
  const modulePermissions = permissions || {};

  const handleActionChange = (action, value) => {
    onChange({
      ...modulePermissions,
      [action]: value,
    });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold text-slate-900 mb-3">{module.label}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <div key={action.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${module.id}-${action.id}`}
              checked={modulePermissions[action.id] || false}
              onCheckedChange={(value) => handleActionChange(action.id, value)}
            />
            <label
              htmlFor={`${module.id}-${action.id}`}
              className="cursor-pointer text-sm text-slate-700"
            >
              {action.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}