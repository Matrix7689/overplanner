import * as RadixSlider from "@radix-ui/react-slider";

type Props = {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (value: number) => void;
};

export function Slider({ value, min, max, step, label, onChange }: Props) {
  return (
    <RadixSlider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className="relative flex h-5 flex-1 touch-none items-center select-none"
    >
      <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-soft">
        <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        className="card-shadow block size-5 rounded-full border border-line bg-surface transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-110"
      />
    </RadixSlider.Root>
  );
}
