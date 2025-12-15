'use client';

import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
    field: {
        value: Date | undefined;
        onChange: (value: Date | undefined) => void;
        onBlur: () => void;
    };
    disableFuture?: boolean
}

export const DatePicker: React.FC<DatePickerProps> = ({
    field,
    disableFuture
}) => {
    const handleSelect = (value: Date | undefined) => {
        field.onChange(value);
    };

    const handleBlur = () => {
        field.onBlur();
    };

    return (
        <div onBlur={handleBlur}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className={cn(
                            'w-[240px] pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                        )}
                    >
                        {field.value ? (
                            format(field.value, 'PPP')
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={handleSelect}
                        disabled={disableFuture ? (date) =>
                            date > new Date() || date < new Date('1900-01-01')
                        : false }
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
