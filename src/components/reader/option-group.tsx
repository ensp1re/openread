import type { OptionGroupProps } from "@/types/reader";

export function OptionGroup<T extends string>({ legend, name, value, options, onChange }: OptionGroupProps<T>) {
  return (
    <fieldset className="settings-group">
      <legend>{legend}</legend>
      <div className="segmented">
        {options.map((o) => (
          <label key={o.value} data-option={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.short ? (
              <span title={o.label}>
                <span className="sr-only">{o.label}</span>
                <span aria-hidden="true">{o.short}</span>
              </span>
            ) : (
              <span>{o.label}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
