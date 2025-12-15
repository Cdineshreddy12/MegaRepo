import React, { useState, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// Main Credit Card Container
export interface CreditCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCard = forwardRef<HTMLDivElement, CreditCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-80 h-48 rounded-xl shadow-2xl transform-gpu transition-all duration-500 hover:scale-105 hover:shadow-3xl',
          'bg-gradient-to-br from-slate-100 to-slate-200',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCard.displayName = 'CreditCard'

// Credit Card Flipper
export interface CreditCardFlipperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  isFlipped?: boolean
}

export const CreditCardFlipper = forwardRef<HTMLDivElement, CreditCardFlipperProps>(
  ({ className, children, isFlipped = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full h-full transition-transform duration-700 transform-gpu',
          isFlipped ? '[transform:rotateY(180deg)]' : '',
          className
        )}
        style={{ transformStyle: 'preserve-3d' }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardFlipper.displayName = 'CreditCardFlipper'

// Credit Card Front Side
export interface CreditCardFrontProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardFront = forwardRef<HTMLDivElement, CreditCardFrontProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 w-full h-full rounded-xl backface-hidden',
          'flex flex-col justify-between p-6 text-white',
          className
        )}
        style={{ backfaceVisibility: 'hidden' }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardFront.displayName = 'CreditCardFront'

// Credit Card Back Side
export interface CreditCardBackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardBack = forwardRef<HTMLDivElement, CreditCardBackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 w-full h-full rounded-xl backface-hidden',
          'flex flex-col justify-between p-6 text-white',
          className
        )}
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardBack.displayName = 'CreditCardBack'

// Credit Card Chip
export interface CreditCardChipProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CreditCardChip = forwardRef<HTMLDivElement, CreditCardChipProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-sm',
          'relative overflow-hidden shadow-lg',
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-50" />
        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-700 rounded-full" />
        <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-800 rounded-full" />
        <div className="absolute bottom-1 left-2 w-1.5 h-1.5 bg-yellow-700 rounded-full" />
        <div className="absolute bottom-1 right-1 w-1 h-1 bg-yellow-800 rounded-full" />
      </div>
    )
  }
)
CreditCardChip.displayName = 'CreditCardChip'

// Credit Card Logo (for bank logos)
export interface CreditCardLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardLogo = forwardRef<HTMLDivElement, CreditCardLogoProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-start', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardLogo.displayName = 'CreditCardLogo'

// Credit Card Service Provider (Visa, Mastercard, etc.)
export interface CreditCardServiceProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'visa' | 'mastercard' | 'amex' | 'discover'
  format?: 'logo' | 'text'
}

export const CreditCardServiceProvider = forwardRef<HTMLDivElement, CreditCardServiceProviderProps>(
  ({ className, type, format = 'logo', ...props }, ref) => {
    const getLogo = () => {
      switch (type) {
        case 'visa':
          return (
            <svg viewBox="0 0 38 24" className="w-12 h-8">
              <rect width="38" height="24" rx="4" fill="#1A1F71" />
              <path d="M13.5 6h3.5l-5.5 12h-3.5l5.5-12z" fill="white" />
              <path d="M24 6h3l-2 12h-3l2-12z" fill="white" />
              <path d="M8 6h3.5l-1.5 12H6.5l1.5-12z" fill="white" />
              <path d="M29 6h2.5l-1.5 3.5L32 6h2.5l-2.5 12h-3l2.5-12z" fill="white" />
            </svg>
          )
        case 'mastercard':
          return (
            <svg viewBox="0 0 38 24" className="w-12 h-8">
              <rect width="38" height="24" rx="4" fill="#000" />
              <circle cx="15" cy="12" r="7" fill="#EB001B" />
              <circle cx="23" cy="12" r="7" fill="#F79E1B" />
            </svg>
          )
        case 'amex':
          return (
            <svg viewBox="0 0 38 24" className="w-12 h-8">
              <rect width="38" height="24" rx="4" fill="#006FCF" />
              <path d="M8 8h4v8H8V8zm6 0h4v8h-4V8zm6 0h4v8h-4V8z" fill="white" />
            </svg>
          )
        case 'discover':
          return (
            <svg viewBox="0 0 38 24" className="w-12 h-8">
              <rect width="38" height="24" rx="4" fill="#FF6000" />
              <path d="M8 8h22v8H8V8z" fill="white" />
              <text x="19" y="14" fontSize="6" fill="#FF6000" textAnchor="middle">DISCOVER</text>
            </svg>
          )
        default:
          return null
      }
    }

    const getText = () => {
      switch (type) {
        case 'visa':
          return 'VISA'
        case 'mastercard':
          return 'MASTERCARD'
        case 'amex':
          return 'AMEX'
        case 'discover':
          return 'DISCOVER'
        default:
          return ''
      }
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-end', className)}
        {...props}
      >
        {format === 'logo' ? getLogo() : (
          <span className="text-lg font-bold tracking-wider">{getText()}</span>
        )}
      </div>
    )
  }
)
CreditCardServiceProvider.displayName = 'CreditCardServiceProvider'

// Credit Card Name
export interface CreditCardNameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardName = forwardRef<HTMLDivElement, CreditCardNameProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'text-lg font-semibold tracking-wide',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardName.displayName = 'CreditCardName'

// Credit Card Number
export interface CreditCardNumberProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  format?: boolean
}

export const CreditCardNumber = forwardRef<HTMLDivElement, CreditCardNumberProps>(
  ({ className, children, format = true, ...props }, ref) => {
    const formatNumber = (number: string) => {
      return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
    }

    const displayNumber = format && typeof children === 'string'
      ? formatNumber(children)
      : children

    return (
      <div
        ref={ref}
        className={cn(
          'text-xl font-mono tracking-wider',
          'bg-black bg-opacity-50 px-4 py-2 rounded',
          className
        )}
        {...props}
      >
        {displayNumber}
      </div>
    )
  }
)
CreditCardNumber.displayName = 'CreditCardNumber'

// Credit Card Expiry
export interface CreditCardExpiryProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardExpiry = forwardRef<HTMLDivElement, CreditCardExpiryProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'text-sm font-mono bg-white bg-opacity-90 text-black px-3 py-1 rounded',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardExpiry.displayName = 'CreditCardExpiry'

// Credit Card CVV
export interface CreditCardCvvProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CreditCardCvv = forwardRef<HTMLDivElement, CreditCardCvvProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'text-sm font-mono bg-white bg-opacity-90 text-black px-3 py-1 rounded',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CreditCardCvv.displayName = 'CreditCardCvv'

// Credit Card Magnetic Stripe
export interface CreditCardMagStripeProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CreditCardMagStripe = forwardRef<HTMLDivElement, CreditCardMagStripeProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full h-12 bg-black rounded-sm mb-4',
          className
        )}
        {...props}
      />
    )
  }
)
CreditCardMagStripe.displayName = 'CreditCardMagStripe'
