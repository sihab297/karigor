import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminService } from '../../../pages/admin/admin-types';
import { Alert } from '../../Alert';
import { Button } from '../../Button';
import { Switch } from '../../Switch';
import { TextField } from '../../TextField';
import { useAdminSave } from './use-admin-save';

interface SkillsPanelProps {
  service: AdminService;
  onChanged: () => Promise<void>;
}

export function SkillsPanel({ service, onChanged }: SkillsPanelProps) {
  const { save, saving, errors } = useAdminSave(onChanged);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const base = `/admin/services/${service.id}`;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (await save('add', 'POST', `${base}/skills`, { name: newName })) setNewName('');
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const ok = await save(`rename-${editing.id}`, 'PATCH', `${base}/skills/${editing.id}`, {
      name: editing.name,
    });
    if (ok) setEditing(null);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-line bg-white px-4 py-3">
        <p>
          {service.active
            ? `Customers can choose ${service.name}.`
            : `${service.name} is switched off, so customers can't choose it.`}
        </p>
        <Switch
          label="Service on"
          checked={service.active}
          disabled={saving === 'active'}
          onChange={(active) => void save('active', 'PATCH', base, { active })}
        />
      </div>

      {errors.message && <Alert>{errors.message}</Alert>}

      <ul
        className="grid divide-y divide-line rounded-box border border-line bg-white"
        aria-label="Skills"
      >
        {service.skills.map((skill) => (
          <li key={skill.id} className="px-4 py-3">
            {editing?.id === skill.id ? (
              <form
                className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                onSubmit={handleRename}
              >
                <TextField
                  label="Skill name"
                  value={editing.name}
                  onChange={(event) => setEditing({ id: skill.id, name: event.target.value })}
                  error={errors.fields.name}
                  autoFocus
                />
                <Button type="submit" loading={saving === `rename-${skill.id}`}>
                  Save
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{skill.name}</span>
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    aria-label={`Rename ${skill.name}`}
                    onClick={() => setEditing({ id: skill.id, name: skill.name })}
                    className="grid size-10 place-items-center rounded-box border-[1.5px] border-line hover:border-tea"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${skill.name}`}
                    disabled={saving === `remove-${skill.id}`}
                    onClick={() =>
                      void save(`remove-${skill.id}`, 'DELETE', `${base}/skills/${skill.id}`)
                    }
                    className="grid size-10 place-items-center rounded-box border-[1.5px] border-line text-alert hover:border-alert disabled:opacity-60"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        className="grid gap-2 rounded-box border-[1.5px] border-tea bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={handleAdd}
      >
        <TextField
          label={`New skill for ${service.name}`}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="e.g. Doorbell fitting"
          error={editing ? undefined : errors.fields.name}
        />
        <Button type="submit" loading={saving === 'add'}>
          <Plus size={18} aria-hidden="true" />
          Add skill
        </Button>
      </form>
    </div>
  );
}
