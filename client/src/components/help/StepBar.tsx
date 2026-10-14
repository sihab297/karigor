const steps = [
  { title: 'Tell us the problem', next: "Next you'll see the price, then choose a karigor." },
  { title: 'See the price', next: 'Next, choose a karigor.' },
  { title: 'Choose a karigor', next: 'Then pick a time that suits you.' },
];

export function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const current = steps[step - 1]!;
  return (
    <div className="grid gap-1.5">
      <ol aria-hidden="true" className="grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={`h-1.5 rounded-full ${i < step ? 'bg-turmeric' : 'bg-line'}`}
          />
        ))}
      </ol>
      <p className="text-sm text-muted">
        <b className="text-tea">
          Step {step} of 3: {current.title}.
        </b>{' '}
        {current.next}
      </p>
    </div>
  );
}
