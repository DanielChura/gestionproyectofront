import { useEffect, useState } from "react";
import { projectToday } from "../TaskList/taskGrouping";

export function useGanttToday() {
  const [today, setToday] = useState(() => projectToday());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      setToday(projectToday());
      const now = new Date();
      const day = new Date(now.getTime());
      day.setUTCHours(5, 0, 0, 50);
      if (day.getTime() <= now.getTime()) day.setUTCDate(day.getUTCDate() + 1);
      timer = setTimeout(update, day.getTime() - now.getTime());
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
