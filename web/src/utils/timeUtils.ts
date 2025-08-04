export const getJSTTime = (): Date => {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (jstOffset * 60000));
};

export const parseTimeSlot = (timeSlot: string): { startTime: Date, endTime: Date } => {
  const [startStr, endStr] = timeSlot.split('～');
  const [startHour, startMin] = startStr.split(':').map(Number);
  const [endHour, endMin] = endStr.split(':').map(Number);
  
  const today = getJSTTime();
  const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
  const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
  
  return { startTime, endTime };
};

export const isTimeSlotExpired = (timeSlot: string): boolean => {
  const currentJST = getJSTTime();
  const { startTime } = parseTimeSlot(timeSlot);
  return currentJST >= startTime;
};

export const getAvailableTimeSlots = (targetDate?: Date): Array<{value: string, disabled: boolean}> => {
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
  
  if (!targetDate) {
    return timeSlots.map(slot => ({ value: slot, disabled: false }));
  }
  
  const today = getJSTTime();
  const isToday = targetDate.toDateString() === today.toDateString();
  
  if (!isToday) {
    return timeSlots.map(slot => ({ value: slot, disabled: false }));
  }
  
  return timeSlots.map(slot => ({
    value: slot,
    disabled: isTimeSlotExpired(slot)
  }));
};
