import { TenantConfig } from "@/lib/app-config";
import { Address, EntityType } from "@/types/common";
import { User } from "@/types/User.types";
import { deleteProperties } from "@/utils/common";

export function formatCurrency(
  amount: number,
  currency: string = TenantConfig.locale.currency || "INR",
  locale: string = TenantConfig.locale.language || "en-IN"
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  });

  return formatter.format(isNaN(amount) ? 0 : amount);
}

export function calculateTotal(
  quantity: number,
  unitPrice: number,
  taxPercentage: number
): number {
  // Check if any of the parsed values is NaN and provide default values (0)
  const validQuantity = isNaN(quantity) ? 0 : quantity;
  const validUnitPrice = isNaN(unitPrice) ? 0 : unitPrice;
  const validTax = isNaN(taxPercentage) ? 0 : taxPercentage;

  const subtotal = validQuantity * validUnitPrice;
  const taxAmount = (subtotal * validTax) / 100;
  const total = subtotal + taxAmount;
  return total;
}

export const formatName = (
  user: { firstName: string; lastName: string } | null,
  format: "FN-LN" | "LN-FN" = "FN-LN"
) => {
  if (!user) return "";
  return (
    format === "FN-LN"
      ? [user?.firstName, user?.lastName]
      : [user?.lastName, user?.firstName]
  )
    .filter(Boolean)
    .join(" ");
};

export const formatDetails = (
  details: Record<string, string | number>,
  entityType: EntityType,
  hiddenProps: Record<EntityType, string[]>
) => {
  if (!details) return "";

  const newDetails = deleteProperties(
    { ...details },
    hiddenProps[entityType] || []
  );

  // Format the details in a more readable way
  return Object.entries(newDetails)
    .map(([key, value]) => {
      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    })
    .join(", ");
};

export const formatDate = (
  date: string | number | Date,
  format: string = "DD-MM-YYYY HH:mm"
): string => {
  console.log("date", date);
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const pad = (num: number) => num.toString().padStart(2, "0");

  const replacements: Record<string, string> = {
    YYYY: d.getFullYear().toString(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    MMMM: d.toLocaleString("default", { month: "long" }),
    MMM: d.toLocaleString("default", { month: "short" }),
    dddd: d.toLocaleString("default", { weekday: "long" }),
    ddd: d.toLocaleString("default", { weekday: "short" }),
  };

  return format.replace(/MMMM|MMM|dddd|ddd|YYYY|MM|DD|HH|mm|ss/g, (match) => replacements[match] || match);
};

export function formatAddress(address: Address) {
  const { _id, ...rest } = address || {};
  return Object.values(rest)?.join(", ");
}

export function formatUser(user: Partial<User> | string | undefined) {
  if (!user) return "";
  if (typeof user === "string") {
    if (user.includes && user.includes("@")) {
      return user.split("@")[0];
    }
    return user.length <= 4 ? user : user.slice(0, 2).toUpperCase();
  }
  const first = (user.firstName || "").toString();
  const last = (user.lastName || "").toString();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  const email = (user.email || "").toString();
  if (email.includes("@")) return email.split("@")[0];
  const token = typeof user._id === "string" ? user._id : (typeof (user as any).id === "string" ? (user as any).id : "");
  if (!token) return "";
  return token.length <= 4 ? token : token.slice(0, 2).toUpperCase();
}

export function validateObjectProp<T extends Record<string, unknown>>(
  obj: T | string | undefined,
  key: keyof T
): string {
  if (
    typeof obj === "object" &&
    obj !== null &&
    key in obj &&
    obj[key] !== undefined
  ) {
    return String(obj[key]);
  }
  return typeof obj === "string" ? obj : "";
}

export function validateUser(user: Partial<User> | string | undefined) {
  const userData = user as Record<string, unknown> | string | undefined
  
  // If user is a string, return it as is
  if (typeof userData === "string") {
    return {
      firstName: userData,
      lastName: "",
      id: userData,
      email: "",
    };
  }
  
  // If user is an object, extract the properties without converting to lowercase
  if (userData && typeof userData === "object") {
    // Check if this is a populated user object from backend
    const firstName = validateObjectProp(userData, "firstName");
    const lastName = validateObjectProp(userData, "lastName");
    // Handle both _id and id fields safely
    const id = (userData as any)._id || (userData as any).id || "";
    const email = validateObjectProp(userData, "email") || "";
    const role = validateObjectProp(userData, "role") || "";
    const contactMobile = validateObjectProp(userData, "contactMobile") || "";
    
    return {
      firstName: firstName || "",
      lastName: lastName || "",
      id: id || "",
      email: email || "",
      role: role || "",
      contactMobile: contactMobile || "",
    };
  }
  
  // Fallback for undefined/null
  return {
    firstName: "",
    lastName: "",
    id: "",
    email: "",
    role: "",
    contactMobile: "",
  };
}


