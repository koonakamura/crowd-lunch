export const getJSTTime = (): Date => {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (jstOffset * 60000));
};

export const parseTimeSlot = (timeSlot: string, serveDate?: Date): { startTime: Date, endTime: Date } => {
  const [startStr, endStr] = timeSlot.split('～');
  const [startHour, startMin] = startStr.split(':').map(Number);
  const [endHour, endMin] = endStr.split(':').map(Number);
  
  const targetDate = serveDate || getJSTTime();
  const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), startHour, startMin);
  const endTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), endHour, endMin);
  
  return { startTime, endTime };
};

export const isTimeSlotExpired = (timeSlot: string, serveDate?: Date): boolean => {
  const currentJST = getJSTTime();
  const targetDate = serveDate || currentJST;
  
  if (targetDate.toDateString() !== currentJST.toDateString()) {
    return false;
  }
  
  const { startTime } = parseTimeSlot(timeSlot, serveDate);
  return currentJST >= startTime;
};

export const getAvailableTimeSlots = (serveDate?: Date): Array<{value: string, disabled: boolean}> => {
  const timeSlots = [
    "11:30～11:45",
    "11:45～12:00", 
    "12:00～12:15",
    "12:15～12:30",
    "12:30～12:45",
    "12:45～13:00",
    "13:00～13:15",
    "13:15～13:30",
    "13:30～13:45",
    "13:45～14:00"
  ];
  
  return timeSlots.map(slot => ({
    value: slot,
    disabled: isTimeSlotExpired(slot, serveDate)
  }));
};
