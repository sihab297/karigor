import { useId, useState, type FormEvent } from 'react';
import type { AdminSafetyTip } from '../../../pages/admin/admin-types';
import { Alert } from '../../Alert';
import { Button } from '../../Button';
import { Switch } from '../../Switch';
import { useAdminSave } from './use-admin-save';

function SafetyCard({ tip, onChanged }: { tip: AdminSafetyTip; onChanged: () => Promise<void> }) {
  const stepsId = useId();
  const { save, saving, errors } = useAdminSave(onChanged);
  const [steps, setSteps] = useState(tip.tips.join('\n'));
  const [saved, setSaved] = useState(false);
  const list = steps
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const changed = list.join('\n') !== tip.tips.join('\n');
  // the server names the list ("tips") or one step in it ("tips.2")
  const stepsError = Object.entries(errors.fields).find(([field]) => field.startsWith('tips'))?.[1];

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    if (await save('tips', 'PATCH', `/admin/safety-tips/${tip.id}`, { tips: list })) setSaved(true);
  }

  return (
    <form
      className="grid gap-3 rounded-box border border-line bg-white p-4"
      aria-label={tip.name}
      onSubmit={handleSave}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{tip.name}</h3>
        <Switch
          label="Shown"
          checked={tip.active}
          disabled={saving === 'active'}
          onChange={(active) =>
            void save('active', 'PATCH', `/admin/safety-tips/${tip.id}`, { active })
          }
        />
      </div>
      {errors.message && <Alert>{errors.message}</Alert>}
      <div className="grid gap-1.5">
        <label htmlFor={stepsId} className="text-sm font-semibold">
          Safety steps, one per line, most important first
        </label>
        <textarea
          id={stepsId}
          rows={Math.max(4, list.length + 1)}
          value={steps}
          onChange={(event) => {
            setSteps(event.target.value);
            setSaved(false);
          }}
          className="w-full resize-y rounded-box border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base focus:border-tea focus:outline-none"
        />
        {stepsError && <p className="text-sm font-medium text-alert">{stepsError}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving === 'tips'} disabled={!changed}>
          Save steps
        </Button>
        {saved && !changed && <span className="text-sm font-semibold text-pond">Saved</span>}
      </div>
    </form>
  );
}

export function SafetyPanel({
  tips,
  onChanged,
}: {
  tips: AdminSafetyTip[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4">
      <p className="text-muted">
        Shown in red at the top of the result when the AI finds an emergency. Keep the steps short
        and check them with Fire Service guidance.
      </p>
      {tips.map((tip) => (
        <SafetyCard key={tip.id} tip={tip} onChanged={onChanged} />
      ))}
    </div>
  );
}
