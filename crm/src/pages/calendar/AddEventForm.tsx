import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import {FormSection, FormGroup, ActionType} from '@/components/common/form-elements'
import { FormField } from '../common/form-elements/FormField';
import { Button } from '@/components/ui/button';

function AddEventForm({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    start: '',
    end: '',
    description: '',
    participants: [],
    location: '',
    reminder: false
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.type) newErrors.type = 'Event type is required';
    if (!formData.start) newErrors.start = 'Start date/time is required';
    if (!formData.end) newErrors.end = 'End date/time is required';
    if (new Date(formData.end) <= new Date(formData.start)) {
      newErrors.end = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const eventTypeOptions = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'call', label: 'Call' },
    { value: 'task', label: 'Task' },
    { value: 'reminder', label: 'Reminder' }
  ];

  const participantOptions = [
    { value: '1', label: 'John Doe' },
    { value: '2', label: 'Jane Smith' },
    { value: '3', label: 'Mike Johnson' }
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Event</DialogTitle>
      </DialogHeader>

      <Form onSubmit={handleSubmit}>
        <FormSection>
          <FormGroup>
            <FormField
              label="Event Type"
              name="type"
              type="select"
              value={formData.type}
              onChange={handleChange}
              error={errors.type}
              options={eventTypeOptions}
              required
            />
            <FormField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter location or meeting link"
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <FormField
            label="Event Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
            placeholder="Enter event title"
          />
        </FormSection>

        <FormSection>
          <FormGroup>
            <FormField
              label="Start Date/Time"
              name="start"
              type="datetime-local"
              value={formData.start}
              onChange={handleChange}
              error={errors.start}
              required
            />
            <FormField
              label="End Date/Time"
              name="end"
              type="datetime-local"
              value={formData.end}
              onChange={handleChange}
              error={errors.end}
              required
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter event description"
          />
        </FormSection>

        <FormSection>
          <FormField
            label="Participants"
            name="participants"
            type="select"
            value={formData.participants}
            onChange={handleChange}
            options={participantOptions}
            multiple
          />
        </FormSection>

        <FormSection>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reminder"
              name="reminder"
              checked={formData.reminder}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-blue-500"
            />
            <label htmlFor="reminder" className="text-sm text-gray-700">
              Set Reminder
            </label>
          </div>
        </FormSection>



        <ActionType>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
          >
            Create Event
          </Button>
        </ActionType>
      </Form>
    </>
  );
}

export default AddEventForm;