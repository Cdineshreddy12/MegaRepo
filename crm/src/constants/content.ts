import { ActionType, EntityType } from "@/types/common";
import logo from "@/assets/logo.jpeg";
import { TenantConfig } from "@/lib/app-config";

interface FormModal {
    title: string
    titleBulk?: string,
    description?: string
}

const forms: Record<EntityType, Record<Exclude<ActionType, 'PREVIEW'>, FormModal>> = {
    ACCOUNT: {
        VIEW: {
            title: "Account Details"
        },
        CREATE: {
            title: 'Create Account',
            titleBulk: 'Bulk Upload Accounts',
            description: 'fill all the required field to create account'
        },
        MODIFY: {
            title: 'Update Account'
        },
        DELETE: {
            title: 'Delete Account'
        }
    },
    LEAD:      {
        VIEW: {
            title: "Lead Details"
        },
        CREATE: {
            title: 'Create Lead',
            titleBulk: 'Bulk Upload Leads',
            description: 'fill all the required field to create Lead'
        },
        MODIFY: {
            title: 'Update Lead'
        },
        DELETE: {
            title: 'Delete Lead'
        }
    },
    CONTACT:      {
        VIEW: {
            title: 'Contact Details',
        },
        CREATE: {
            title: 'Create Contact',
            titleBulk: 'Bulk Upload Contacts',
            description: 'fill all the required field to create Contact'
        },
        MODIFY: {
            title: 'Update Contact'
        },
        DELETE: {
            title: 'Delete Contact'
        }
    },
    OPPORTUNITY:      {
        VIEW: {
            title: 'Opportunity Details',
        },
        CREATE: {
            title: 'Create Opportunity',
            titleBulk: 'Bulk Upload Opportunities',
            description: 'fill all the required field to create Opportunity'
        },
        MODIFY: {
            title: 'Update Opportunity'
        },
        DELETE: {
            title: 'Delete Opportunity'
        }
    },
    QUOTATION:      {
        VIEW: {
            title: 'Quotation Details',
        },
        CREATE: {
            title: 'Create Quotation',
            titleBulk: 'Bulk Upload Quotations',
            description: 'fill all the required field to create Quotation'
        },
        MODIFY: {
            title: 'Update Quotation'
        },
        DELETE: {
            title: 'Delete Quotation'
        }
    },
    TICKET:      {
        VIEW: {
            title: 'Ticket Details',
        },
        CREATE: {
            title: 'Create Ticket',
            titleBulk: 'Bulk Upload Tickets',
            description: 'fill all the required field to create Ticket'
        },
        MODIFY: {
            title: 'Update Ticket'
        },
        DELETE: {
            title: 'Delete Ticket'
        }
    },
    USER:      {
        VIEW: {
            title: 'User Details',
        },
        CREATE: {
            title: 'Create User',
            titleBulk: 'Bulk Upload Users',
            description: 'fill all the required field to create User'
        },
        MODIFY: {
            title: 'Update User'
        },
        DELETE: {
            title: 'Delete User'
        }
    },
    ACTIVITY_LOG:      {
        VIEW: {
            title: 'Activity Log Details',
        },
        CREATE: {
            title: 'Create Activity Log',
            titleBulk: 'Bulk Upload Activity Logs',
            description: 'fill all the required field to create Activity Log'
        },
        MODIFY: {
            title: 'Update Activity Log'
        },
        DELETE: {
            title: 'Delete Activity Log'
        }
    },
    AI_INSIGHTS: {
        VIEW: {
            title: 'AI Insights Details',
        },
        CREATE: {
            title: 'Create AI Insight',
            titleBulk: 'Bulk Upload AI Insights',
            description: 'fill all the required field to create AI Insight'
        },
        MODIFY: {
            title: 'Update AI Insight'
        },
        DELETE: {
            title: 'Delete AI Insight'
        }
    },
    SALES_ORDER: {
        VIEW: {
            title: 'Sales Order Details',
        },
        CREATE: {
            title: 'Create Sales Order',
            titleBulk: 'Bulk Upload Sales Orders',
            description: 'fill all the required field to create Sales Order'
        },
        MODIFY: {
            title: 'Update Sales Order'
        },
        DELETE: {
            title: 'Delete Sales Order'
        }
    },
    INVOICE: {
        VIEW: {
            title: 'Invoice Details',
        },
        CREATE: {
            title: 'Create Invoice',
            titleBulk: 'Bulk Upload Invoices',
            description: 'fill all the required field to create Invoice'
        },
        MODIFY: {
            title: 'Update Invoice'
        },
        DELETE: {
            title: 'Delete Invoice'
        }
    },
    PRODUCT_ORDER: {
        VIEW: {
            title: 'Product Order Details',
        },
        CREATE: {
            title: 'Create Product Order',
            titleBulk: 'Bulk Upload Product Orders',
            description: 'fill all the required field to create Product Order'
        },
        MODIFY: {
            title: 'Update Product Order'
        },
        DELETE: {
            title: 'Delete Product Order'
        }
    },
    INVENTORY: {
        VIEW: {
            title: 'Product Details',
        },
        CREATE: {
            title: 'Create Product',
            titleBulk: 'Bulk Upload Product',
            description: 'fill all the required field to create Product'
        },
        MODIFY: {
            title: 'Update Product'
        },
        DELETE: {
            title: 'Delete Product'
        }
    },
    SERIAL_NUMBER: {
        VIEW: {
            title: "Product Serial Number Details",
        },
        CREATE: {
            title: "Create Product Serial Number",
            titleBulk: "Bulk Upload Product Serial Numbers",
            description: "Fill all the required fields to create Product Serial Number",
        },
        MODIFY: {
            title: "Update Product Serial Number",
        },
        DELETE: {
            title: "Delete Product Serial Number",
        },
    },
    MOVEMENT: {
        VIEW: {
            title: "Product Movement Details",
        },
        CREATE: {
            title: "Record Product Movement",
            titleBulk: "Bulk Upload Product Movements",
            description: "Fill all the required fields to record Product Movement",
        },
        MODIFY: {
            title: "Update Product Movement",
        },
        DELETE: {
            title: "Delete Product Movement",
        },
    },
}

type FormActionLabels = {
    SUBMIT?: string,
    CLOSE: string
}
export const defaultFormActionLabels: FormActionLabels = {
    SUBMIT: 'Submit',
    CLOSE: 'Close'
}
const formActionLabels: Record<EntityType, FormActionLabels > = {
    ACCOUNT: {
        SUBMIT: forms.ACCOUNT.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    LEAD: {
        SUBMIT: forms.LEAD.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE

    },
    CONTACT: {
        SUBMIT: forms.CONTACT.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE

    },
    OPPORTUNITY: {
        SUBMIT: forms.OPPORTUNITY.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE

    },
    QUOTATION: {
        SUBMIT: forms.QUOTATION.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE

    },
    TICKET: {
        SUBMIT: forms.TICKET.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE

    },
    USER: {
        SUBMIT: forms.USER.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    ACTIVITY_LOG: {
        SUBMIT: 'Activity Log',
        CLOSE: defaultFormActionLabels.CLOSE
    },
    AI_INSIGHTS: {
        SUBMIT: forms.AI_INSIGHTS.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    SALES_ORDER: {
        SUBMIT: forms.SALES_ORDER.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    INVOICE: {
        SUBMIT: forms.INVOICE.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    PRODUCT_ORDER: {
        SUBMIT: forms.PRODUCT_ORDER.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
    INVENTORY: {
        SUBMIT: forms.INVENTORY.CREATE.title,
        CLOSE: defaultFormActionLabels.CLOSE
    },
   
    SERIAL_NUMBER: {
        SUBMIT: 'Create Serial Number',
        CLOSE: defaultFormActionLabels.CLOSE
    },
    MOVEMENT: {
        SUBMIT: 'Record Movement',
        CLOSE: defaultFormActionLabels.CLOSE
    }
}

const ROOT_PATHS: Record<EntityType, string> = {
    ACCOUNT: '/accounts',
    LEAD: '/leads',
    CONTACT: '/contacts',
    OPPORTUNITY: '/opportunities',
    QUOTATION: '/quotations',
    TICKET: '/tickets',
    USER: '/users',
    ACTIVITY_LOG: '/activity-logs',
    AI_INSIGHTS: '/ai-insights',
    SALES_ORDER: '/sales-orders',
    INVOICE: '/invoices',
    PRODUCT_ORDER: '/product-orders',
    INVENTORY: '/inventory',
    SERIAL_NUMBER: '/serial-numbers',
    MOVEMENT: '/movements',

}
type PathType = 'ROOT' | 'VIEW' | 'CREATE' | 'MODIFY'

export const routePaths: Record<EntityType, Record<PathType, string>> = {
    ACCOUNT: {
        ROOT: ROOT_PATHS.ACCOUNT,
        VIEW: `${ROOT_PATHS.ACCOUNT}/view`,
        CREATE: `${ROOT_PATHS.ACCOUNT}/new`,
        MODIFY: `${ROOT_PATHS.ACCOUNT}/edit`, 
    },
    LEAD: {
        ROOT: ROOT_PATHS.LEAD,
        VIEW: `${ROOT_PATHS.LEAD}/view`,
        CREATE: `${ROOT_PATHS.LEAD}/new`,
        MODIFY: `${ROOT_PATHS.LEAD}/edit`,
    },
    CONTACT: {
        ROOT: ROOT_PATHS.CONTACT,
        VIEW: `${ROOT_PATHS.CONTACT}/view`,
        CREATE: `${ROOT_PATHS.CONTACT}/new`,
        MODIFY: `${ROOT_PATHS.CONTACT}/edit`,
    },
    OPPORTUNITY: {
        ROOT: ROOT_PATHS.OPPORTUNITY,
        VIEW: `${ROOT_PATHS.OPPORTUNITY}/view`,
        CREATE: `${ROOT_PATHS.OPPORTUNITY}/new`,
        MODIFY: `${ROOT_PATHS.OPPORTUNITY}/edit`,
    },
    QUOTATION: {
        ROOT: ROOT_PATHS.QUOTATION,
        VIEW: `${ROOT_PATHS.QUOTATION}/view`,
        CREATE: `${ROOT_PATHS.QUOTATION}/new`,
        MODIFY: `${ROOT_PATHS.QUOTATION}/edit`,
    },
    TICKET: {
        ROOT: ROOT_PATHS.TICKET,
        VIEW: `${ROOT_PATHS.TICKET}/view`,
        CREATE: `${ROOT_PATHS.TICKET}/new`,
        MODIFY: `${ROOT_PATHS.TICKET}/edit`,
    },
    USER: {
        ROOT: ROOT_PATHS.USER,
        VIEW: `${ROOT_PATHS.USER}/view`,
        CREATE: `${ROOT_PATHS.USER}/new`,
        MODIFY: `${ROOT_PATHS.USER}/edit`,
    },
    ACTIVITY_LOG: {
        ROOT: ROOT_PATHS.ACTIVITY_LOG,
        VIEW: `${ROOT_PATHS.ACTIVITY_LOG}/view`,
        CREATE: `${ROOT_PATHS.ACTIVITY_LOG}/new`,
        MODIFY: `${ROOT_PATHS.ACTIVITY_LOG}/edit`,
    },
    AI_INSIGHTS: {
        ROOT: ROOT_PATHS.AI_INSIGHTS,
        VIEW: `${ROOT_PATHS.AI_INSIGHTS}/view`,
        CREATE: `${ROOT_PATHS.AI_INSIGHTS}/new`,
        MODIFY: `${ROOT_PATHS.AI_INSIGHTS}/edit`,
    },
    SALES_ORDER: {
        ROOT: ROOT_PATHS.SALES_ORDER,
        VIEW: `${ROOT_PATHS.SALES_ORDER}/view`,
        CREATE: `${ROOT_PATHS.SALES_ORDER}/new`,
        MODIFY: `${ROOT_PATHS.SALES_ORDER}/edit`,
    },
    INVOICE: {
        ROOT: ROOT_PATHS.INVOICE,
        VIEW: `${ROOT_PATHS.INVOICE}/view`,
        CREATE: `${ROOT_PATHS.INVOICE}/new`,
        MODIFY: `${ROOT_PATHS.INVOICE}/edit`,
    },
    PRODUCT_ORDER: {
        ROOT: ROOT_PATHS.PRODUCT_ORDER,
        VIEW: `${ROOT_PATHS.PRODUCT_ORDER}/view`,
        CREATE: `${ROOT_PATHS.PRODUCT_ORDER}/new`,
        MODIFY: `${ROOT_PATHS.PRODUCT_ORDER}/edit`,
    },
    INVENTORY: {
        ROOT: ROOT_PATHS.INVENTORY,
        VIEW: `${ROOT_PATHS.INVENTORY}/view`,
        CREATE: `${ROOT_PATHS.INVENTORY}/new`,
        MODIFY: `${ROOT_PATHS.INVENTORY}/edit`,
    },
    SERIAL_NUMBER: {
        ROOT: ROOT_PATHS.SERIAL_NUMBER,
        VIEW: `${ROOT_PATHS.SERIAL_NUMBER}/view`,
        CREATE: `${ROOT_PATHS.SERIAL_NUMBER}/new`,
        MODIFY: `${ROOT_PATHS.SERIAL_NUMBER}/edit`,
    },
    MOVEMENT: {
        ROOT: ROOT_PATHS.MOVEMENT,
        VIEW: `${ROOT_PATHS.MOVEMENT}/view`,
        CREATE: `${ROOT_PATHS.MOVEMENT}/new`,
        MODIFY: `${ROOT_PATHS.MOVEMENT}/edit`,
    }
}

const App = {
    name: TenantConfig.name,
    logo: TenantConfig.branding.logoUrl || logo,
}
export const CONTENT = {
    FORM: forms,
    FORM_ACTION_LABELS: formActionLabels,
    APP: App,    
}

