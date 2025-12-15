import * as React from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';

interface DatePickerWithRangeProps {
    field: {
        value: DateRange | undefined;
        onChange: (value: DateRange | undefined) => void;
        onBlur: () => void;
    };
}

const DatePickerWithRange: React.FC<DatePickerWithRangeProps> = ({ field }) => {
    const handleSelect = (value: DateRange | undefined) => {
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
                        id="date"
                        variant={'outline'}
                        className={`w-full justify-start text-left font-normal ${!field.value ? 'text-muted-foreground' : ''
                            }`}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                            field.value.to ? (
                                <>
                                    {format(field.value.from, 'LLL dd, y')} -{' '}
                                    {format(field.value.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(field.value.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from || new Date()}
                        selected={field.value}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default DatePickerWithRange;
