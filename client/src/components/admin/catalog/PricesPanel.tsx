import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { takaRange } from '../../../lib/money';
import type { AdminPriceItem, AdminService } from '../../../pages/admin/admin-types';
import { Alert } from '../../Alert';
import { Button } from '../../Button';
import { Modal } from '../../Modal';
import { Switch } from '../../Switch';
import { TextField } from '../../TextField';
import { useAdminSave } from './use-admin-save';

interface PricesPanelProps {
  service: AdminService;
  items: AdminPriceItem[];
  onChanged: () => Promise<void>;
}

interface Draft {
  name: string;
  skillId: string;
  minPrice: string;
  maxPrice: string;
  unit: string;
  quickPick: string;
}

const emptyDraft: Draft = {
  name: '',
  skillId: '',
  minPrice: '',
  maxPrice: '',
  unit: '',
  quickPick: '',
};

function toDraft(item: AdminPriceItem): Draft {
  return {
    name: item.name,
    skillId: item.skillId ?? '',
    minPrice: String(item.minPrice),
    maxPrice: String(item.maxPrice),
    unit: item.unit,
    quickPick: item.quickPick ?? '',
  };
}

function PriceForm({
  service,
  title,
  initial,
  saving,
  errors,
  onSubmit,
  onCancel,
}: {
  service: AdminService;
  title: string;
  initial: Draft;
  saving: boolean;
  errors: Record<string, string>;
  onSubmit: (draft: Draft) => void;
  onCancel?: () => void;
}) {
  const skillId = useId();
  const [draft, setDraft] = useState(initial);
  const set = (field: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [field]: event.target.value }));
  const digits = (field: 'minPrice' | 'maxPrice') => (event: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [field]: event.target.value.replace(/[^\d]/g, '') }));

  return (
    <form
      className="grid gap-3"
      aria-label={title}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit(draft);
      }}
      noValidate
    >
      <TextField label="Work" value={draft.name} onChange={set('name')} error={errors.name} />
      <div className="grid gap-1.5">
        <label htmlFor={skillId} className="text-sm font-semibold">
          Skill
        </label>
        <select
          id={skillId}
          value={draft.skillId}
          onChange={set('skillId')}
          className="h-12 rounded-box border-[1.5px] border-line bg-white px-3 text-base focus:border-tea focus:outline-none"
        >
          <option value="">No skill (visit and check)</option>
          {service.skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        {errors.skillId && <p className="text-sm font-medium text-alert">{errors.skillId}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Lowest (Tk)"
          inputMode="numeric"
          value={draft.minPrice}
          onChange={digits('minPrice')}
          error={errors.minPrice}
        />
        <TextField
          label="Highest (Tk)"
          inputMode="numeric"
          value={draft.maxPrice}
          onChange={digits('maxPrice')}
          error={errors.maxPrice}
        />
      </div>
      <TextField
        label="Unit"
        placeholder="e.g. per tap"
        value={draft.unit}
        onChange={set('unit')}
        error={errors.unit}
      />
      <TextField
        label="Quick pick (optional)"
        hint="Short words customers tap on the quick path, like “Fan not working”."
        value={draft.quickPick}
        onChange={set('quickPick')}
        error={errors.quickPick}
        maxLength={40}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          Save
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

const body = (draft: Draft) => ({
  name: draft.name,
  skillId: draft.skillId || null,
  minPrice: draft.minPrice === '' ? undefined : Number(draft.minPrice),
  maxPrice: draft.maxPrice === '' ? undefined : Number(draft.maxPrice),
  unit: draft.unit,
  quickPick: draft.quickPick,
});

export function PricesPanel({ service, items, onChanged }: PricesPanelProps) {
  const { save, saving, errors, setErrors } = useAdminSave(onChanged);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminPriceItem | null>(null);
  const [addKey, setAddKey] = useState(0);
  const skillName = (id: string | null) =>
    service.skills.find((skill) => skill.id === id)?.name ?? 'Visit and check';

  return (
    <div className="grid gap-4">
      {errors.message && !editingId && !adding && <Alert>{errors.message}</Alert>}

      <ul
        className="grid divide-y divide-line rounded-box border border-line bg-white"
        aria-label="Price list"
      >
        {items.length === 0 && <li className="px-4 py-3 text-muted">No price items yet.</li>}
        {items.map((item) => (
          <li key={item.id} className="grid gap-2 px-4 py-3">
            {editingId === item.id ? (
              <>
                {errors.message && <Alert>{errors.message}</Alert>}
                <PriceForm
                  service={service}
                  title={`Edit ${item.name}`}
                  initial={toDraft(item)}
                  saving={saving === `edit-${item.id}`}
                  errors={errors.fields}
                  onCancel={() => {
                    setEditingId(null);
                    setErrors({ fields: {}, message: '' });
                  }}
                  onSubmit={async (draft) => {
                    const ok = await save(
                      `edit-${item.id}`,
                      'PATCH',
                      `/admin/price-items/${item.id}`,
                      body(draft),
                    );
                    if (ok) setEditingId(null);
                  }}
                />
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={item.active ? '' : 'opacity-60'}>
                  <b>{item.name}</b>
                  <p className="text-sm text-muted">
                    {takaRange(item.minPrice, item.maxPrice)} · {item.unit} ·{' '}
                    {skillName(item.skillId)}
                    {item.quickPick && ` · quick pick “${item.quickPick}”`}
                  </p>
                </div>
                <span className="flex items-center gap-1.5">
                  <Switch
                    label={item.active ? 'On' : 'Off'}
                    checked={item.active}
                    disabled={saving === `active-${item.id}`}
                    onChange={(active) =>
                      void save(`active-${item.id}`, 'PATCH', `/admin/price-items/${item.id}`, {
                        active,
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => {
                      setAdding(false);
                      setEditingId(item.id);
                    }}
                    className="grid size-10 place-items-center rounded-box border-[1.5px] border-line hover:border-tea"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setRemoving(item)}
                    className="grid size-10 place-items-center rounded-box border-[1.5px] border-line text-alert hover:border-alert"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <section className="grid gap-3 rounded-box border-[1.5px] border-tea bg-white p-4">
          <h3 className="text-lg font-bold">Add a price item</h3>
          {errors.message && <Alert>{errors.message}</Alert>}
          <PriceForm
            key={addKey}
            service={service}
            title="Add a price item"
            initial={emptyDraft}
            saving={saving === 'add'}
            errors={errors.fields}
            onCancel={() => setAdding(false)}
            onSubmit={async (draft) => {
              const ok = await save('add', 'POST', '/admin/price-items', {
                serviceId: service.id,
                ...body(draft),
              });
              if (ok) {
                setAdding(false);
                setAddKey((k) => k + 1);
              }
            }}
          />
        </section>
      ) : (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            setEditingId(null);
            setErrors({ fields: {}, message: '' });
            setAdding(true);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Add a price item
        </Button>
      )}

      {removing && (
        <Modal
          title={`Remove ${removing.name}?`}
          subtitle="Customers will no longer see this price. Old bookings keep their prices."
          onClose={() => setRemoving(null)}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={saving === `remove-${removing.id}`}
              onClick={async () => {
                await save(`remove-${removing.id}`, 'DELETE', `/admin/price-items/${removing.id}`);
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
