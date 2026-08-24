export const jakartaDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const jakartaTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

export const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const validTime = (value: string) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
