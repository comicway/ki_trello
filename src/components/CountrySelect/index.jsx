import { Select } from "antd";

const { Option } = Select;

export const TASK_COUNTRIES = [
  { code: "CL", name: "Chile", flag: "https://flagcdn.com/w40/cl.png" },
  { code: "CO", name: "Colombia", flag: "https://flagcdn.com/w40/co.png" },
  { code: "PE", name: "Perú", flag: "https://flagcdn.com/w40/pe.png" },
];

const getCountry = (code) => TASK_COUNTRIES.find((c) => c.code === code);

export const CountryFlag = ({ code, size = 20 }) => {
  const country = getCountry(code);
  if (!country) return null;
  return (
    <img
      src={country.flag}
      alt=""
      className="rounded-full object-cover border border-border-ki shrink-0"
      style={{ width: size, height: size }}
    />
  );
};

const CountryOption = ({ code }) => {
  const country = getCountry(code);
  if (!country) return null;
  return (
    <span className="flex items-center gap-2">
      <CountryFlag code={code} />
      <span>{country.name}</span>
    </span>
  );
};

export default function CountrySelect({ value, onChange, className = "w-full" }) {
  return (
    <Select
      value={value || undefined}
      onChange={(code) => onChange(code || null)}
      placeholder="Seleccionar país"
      allowClear
      className={className}
      styles={{ popup: { backgroundColor: "#22272b" } }}
      labelRender={({ value: code }) => <CountryOption code={code} />}
    >
      {TASK_COUNTRIES.map((country) => (
        <Option key={country.code} value={country.code}>
          <CountryOption code={country.code} />
        </Option>
      ))}
    </Select>
  );
}
