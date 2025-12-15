// Temporary file with complete ESOP, Flowtilla, Zopkit Academy, and Zopkit ITSM data
// This will be used to complete the productPages.ts file

export const remainingProducts = {
    'esop-system': {
        hero: {
            headline: 'Employee Stock Ownership Plan Management',
            subheadline: 'Grant management, vesting schedules, exercise tracking, and cap table management. Complete ESOP solution.',
            valueProposition: 'Manage your employee equity programs with our comprehensive ESOP platform.',
            primaryCTA: 'Start Free Trial',
            secondaryCTA: 'Watch Demo',
            stats: [{ label: 'Equity Grants', value: '50,000+' }, { label: 'Companies', value: '500+' }, { label: 'Employees', value: '25,000+' }, { label: 'Accuracy', value: '100%' }],
        },
        problem: {
            headline: 'Managing Equity in Spreadsheets?',
            painPoints: [
                { icon: 'FileStack', text: 'Manual grant tracking in spreadsheets' },
                { icon: 'Clock', text: 'Complex vesting calculations' },
                { icon: 'AlertTriangle', text: 'Cap table errors and discrepancies' },
                { icon: 'UserX', text: 'Poor employee visibility' },
                { icon: 'DollarSign', text: 'Tax and compliance risks' },
                { icon: 'Unlink', text: 'No employee self-service' },
            ],
        },
        solution: {
            headline: 'Automate Your Equity Management',
            description: 'Our ESOP platform handles everything from grant creation to exercise. Automate vesting, track cap tables, and provide employee transparency—all in one place.',
            differentiators: [
                { icon: 'Award', text: 'Grant Management: Create and track all equity grants' },
                { icon: 'Calendar', text: 'Vesting Automation: Automatic vesting calculations' },
                { icon: 'PieChart', text: 'Cap Table: Real-time ownership tracking' },
                { icon: 'Shield', text: 'Compliance: Tax and regulatory compliance' },
                { icon: 'Users', text: 'Employee Portal: Self-service equity access' },
                { icon: 'BarChart3', text: 'Reporting: Comprehensive equity reports' },
            ],
        },
        features: [
            { icon: 'Gift', title: 'Grant Management', description: 'Create and manage stock options, RSUs, and other equity grants with flexible terms.' },
            { icon: 'Calendar', title: 'Vesting Schedules', description: 'Automated vesting calculations with cliff periods and custom schedules.' },
            { icon: 'Activity', title: 'Exercise Tracking', description: 'Track option exercises, cashless exercises, and tax withholding.' },
            { icon: 'PieChart', title: 'Cap Table Management', description: 'Real-time cap table with ownership percentages and dilution tracking.' },
            { icon: 'Users', title: 'Employee Portal', description: 'Self-service portal for employees to view grants and vesting schedules.' },
            { icon: 'FileText', title: 'Document Generation', description: 'Automated grant agreements, exercise notices, and tax forms.' },
            { icon: 'Shield', title: 'Compliance', description: 'Tax compliance, 409A valuations, and regulatory reporting.' },
            { icon: 'BarChart3', title: 'Equity Reports', description: 'Comprehensive reports on grants, vesting, exercises, and ownership.' },
            { icon: 'Bell', title: 'Notifications', description: 'Automated notifications for vesting milestones and exercise windows.' },
            { icon: 'Database', title: 'Scenario Modeling', description: 'Model different scenarios for fundraising and liquidity events.' },
        ],
        useCases: [
            { title: 'Startups', description: 'Manage employee equity from day one with simple ESOP management.', benefits: ['Easy grant creation', 'Vesting automation', 'Employee transparency', 'Cap table tracking'] },
            { title: 'Growth Companies', description: 'Scale your equity program as you grow and raise funding.', benefits: ['Advanced vesting', 'Fundraising scenarios', 'Compliance tracking', 'Investor reporting'] },
            { title: 'Public Companies', description: 'Enterprise-grade equity management for public companies.', benefits: ['Complex grants', 'Tax compliance', 'Audit trails', 'Advanced reporting'] },
        ],
        pricing: {
            headline: 'Simple, Transparent Pricing',
            tiers: [
                { name: 'Starter', price: '$199', period: '/month', description: 'Perfect for startups', features: ['Up to 50 employees', 'Grant management', 'Vesting automation', 'Employee portal', 'Email support'], cta: 'Start Free Trial' },
                { name: 'Professional', price: '$499', period: '/month', description: 'For growing companies', features: ['Up to 500 employees', 'Cap table management', 'Scenario modeling', 'Advanced reporting', 'Priority support'], cta: 'Start Free Trial', popular: true },
                { name: 'Enterprise', price: 'Custom', period: 'Pricing', description: 'For large organizations', features: ['Unlimited employees', 'Custom workflows', 'Dedicated support', 'Advanced compliance', 'SLA guarantees'], cta: 'Contact Sales' },
            ],
        },
        socialProof: {
            testimonial: { quote: 'Managing our ESOP was a nightmare before. Now it\'s automated and our employees love the transparency.', author: 'Lisa Anderson', title: 'Head of People', company: 'StartupCo' },
            stats: [{ label: 'Companies', value: '500+' }, { label: 'Equity Grants', value: '50,000+' }, { label: 'Employees', value: '25,000+' }],
        },
        finalCTA: { headline: 'Ready to Modernize Your Equity Management?', description: 'Join 500+ companies using our ESOP platform.', primaryCTA: 'Start Free Trial', secondaryCTAs: ['Schedule Demo', 'Contact Sales'] },
    },
};
