export const MALAYSIA_LOCALE = "ms-MY";
export const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";

type DateValue = unknown;

function toDate(value: DateValue) {
	if (!value) return null;
	const date =
		value instanceof Date
			? value
			: typeof value === "string" || typeof value === "number"
				? new Date(value)
				: null;
	if (!date) return null;
	return Number.isNaN(date.getTime()) ? null : date;
}

function getMalaysiaDateParts(date: Date) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: MALAYSIA_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return {
		year: get("year"),
		month: get("month"),
		day: get("day"),
	};
}

export function getMalaysiaDateInputValue(date = new Date()) {
	const parts = getMalaysiaDateParts(date);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatMalaysiaTime(value: DateValue = new Date()) {
	const date = toDate(value);
	if (!date) return "";
	return date.toLocaleTimeString(MALAYSIA_LOCALE, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: MALAYSIA_TIME_ZONE,
	});
}

export function formatMalaysiaDate(value: DateValue, fallback = "-") {
	const date = toDate(value);
	if (!date) return fallback;
	return date.toLocaleDateString(MALAYSIA_LOCALE, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: MALAYSIA_TIME_ZONE,
	});
}

export function formatMalaysiaDateTime(value: DateValue, fallback = "-") {
	const date = toDate(value);
	if (!date) return fallback;
	return date.toLocaleString(MALAYSIA_LOCALE, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: MALAYSIA_TIME_ZONE,
	});
}

export function addDaysToDateInputValue(dateValue: DateValue, days: number) {
	const raw = String(dateValue ?? "").trim();
	const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return raw || "-";

	const date = new Date(
		Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
	);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
