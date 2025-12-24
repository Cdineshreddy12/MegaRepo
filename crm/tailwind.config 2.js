/** @type {import('tailwindcss').Config} */

module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    safelist: [
      // Grid columns
      'grid-cols-1',
      'grid-cols-2',
      'grid-cols-3',
      'grid-cols-4',
      'grid-cols-6',
      'grid-cols-12',
      // Column spans
      'col-span-1',
      'col-span-2',
      'col-span-3',
      'col-span-4',
      'col-span-6',
      'col-span-8',
      'col-span-9',
      'col-span-12',
    ],
  theme: {
  	extend: {
		animation: {
			first: "moveVertical 30s ease infinite",
			second: "moveInCircle 20s reverse infinite",
			third: "moveInCircle 40s linear infinite",
			fourth: "moveHorizontal 40s ease infinite",
			fifth: "moveInCircle 20s ease infinite",
		  },
		  keyframes: {
			moveHorizontal: {
			  "0%": {
				transform: "translateX(-50%) translateY(-10%)",
			  },
			  "50%": {
				transform: "translateX(50%) translateY(10%)",
			  },
			  "100%": {
				transform: "translateX(-50%) translateY(-10%)",
			  },
			},
			moveInCircle: {
			  "0%": {
				transform: "rotate(0deg)",
			  },
			  "50%": {
				transform: "rotate(180deg)",
			  },
			  "100%": {
				transform: "rotate(360deg)",
			  },
			},
			moveVertical: {
			  "0%": {
				transform: "translateY(-50%)",
			  },
			  "50%": {
				transform: "translateY(50%)",
			  },
			  "100%": {
				transform: "translateY(-50%)",
			  },
			},
		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
