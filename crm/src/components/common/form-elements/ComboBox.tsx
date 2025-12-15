'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface ComboboxProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  options: { value: string; label: string | React.ReactNode }[]
  multi?: boolean
  onBlur?: () => void
  name: string
  id?: string
  placeholder?: string
  label?: string
  disabled?: boolean
  includeAllOption?: boolean
}

const allOption = { value: 'all', label: "All"}

const Combobox: React.FC<ComboboxProps> = ({
  value,
  onChange,
  onBlur,
  options,
  multi = false,
  name,
  id,
  placeholder = 'Select option(s)...',
  label,
  disabled = false,
  includeAllOption = false,

}) => {
  const optionsWithAll = React.useMemo(() => includeAllOption ? [allOption, ...options] : options, [includeAllOption, options])

  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  
  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return optionsWithAll;
    
    return optionsWithAll.filter(option => {
      const optionLabel = typeof option.label === 'string' 
        ? option.label.toLowerCase() 
        : String(option.label).toLowerCase();
      
      return optionLabel.includes(searchQuery.toLowerCase());
    });
  }, [optionsWithAll, searchQuery]);

  const isSelected = (optionValue: string) => {
    return multi
      ? Array.isArray(value) && value.includes(optionValue)
      : value === optionValue
  }

  const handleSelect = (selectedValue: string) => {
    if (multi) {
      if (Array.isArray(value) && value.includes(selectedValue)) {
        onChange(value.filter((val) => val !== selectedValue))
      } else {
        if (selectedValue === allOption.value) {
          onChange([...(options.map(option => option.value) as string[])])
        } else {
          onChange([...(Array.isArray(value) ? value : []), selectedValue])
        }
      }
    } else {
      onChange(selectedValue)
      setOpen(false) // Close the popover after selecting in single mode
    }
  }

  const handleRemoveChip = (valueToRemove: string) => {
    if (multi && Array.isArray(value)) {
      onChange(value.filter((val) => val !== valueToRemove))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          onBlur={onBlur}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between flex items-center space-x-2 h-auto"
          disabled={disabled}
        >
          <div className="flex items-center flex-wrap gap-1 max-w-full overflow-hidden">
            {multi ? (
              (Array.isArray(value) && value.length > 0) ? (
                value.map((val) => (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="flex items-center"
                  >
                    {optionsWithAll.find((option) => option.value === val)?.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveChip(val)
                      }}
                      className="ml-2 rounded-full p-1 hover:bg-gray-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )
            ) : value ? (
              optionsWithAll.find((option) => option.value === value)?.label
            ) : (
              label || placeholder
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 popover-content-width-full">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search..." 
            name={name} 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions
                .filter((option) => option.value !== "" && option.value !== null && option.value !== undefined)
                .map((option) => (
                  <CommandItem
                    id={id}
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected(option.value) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Combobox