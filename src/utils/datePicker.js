import dayjs from "dayjs";

export const toDayjs = (value) => {
  if (value == null || value === "") return null;
  if (dayjs.isDayjs(value)) return value;
  if (typeof value?.toDate === "function") return dayjs(value.toDate());
  return dayjs(value);
};

export const panelDayjs = (value) => toDayjs(value) || dayjs();
