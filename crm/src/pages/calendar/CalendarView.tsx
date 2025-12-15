import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import AddEventForm from "./AddEventForm";


interface Event {
  id: string;
  title: string;
  type: "task" | "meeting" | "call";
  start: string;
  end: string;
  description: string;
  participants?: string[];
}

function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "Client Meeting",
      type: "meeting",
      start: "2024-02-20T10:00",
      end: "2024-02-20T11:00",
      description: "Discuss project requirements",
      participants: ["John Doe", "Jane Smith"],
    },
    {
      id: "2",
      title: "Follow-up Call",
      type: "call",
      start: "2024-02-20T14:00",
      end: "2024-02-20T14:30",
      description: "Product demo follow-up",
      participants: ["Mike Johnson"],
    },
  ]);

  const handleAddEvent = (eventData) => {
    const newEvent = {
      id: (events.length + 1).toString(),
      ...eventData,
    };
    setEvents([...events, newEvent]);
    setShowEventForm(false);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const handleDateClick = (day) => {
    console.log("Date clicked:", day);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <Button onClick={() => setShowEventForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <Calendar
        month={currentDate.getMonth()}
        year={currentDate.getFullYear()}
        events={events}
        onDateClick={handleDateClick}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />

      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent>
          <AddEventForm
            onClose={() => setShowEventForm(false)}
            onSave={handleAddEvent}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CalendarView;
