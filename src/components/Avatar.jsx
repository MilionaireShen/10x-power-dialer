import { initials } from "../data/mockData";

export default function Avatar({ name, color = "#5B3FE0", size = 40 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundColor: color,
      }}
    >
      {initials(name)}
    </div>
  );
}
