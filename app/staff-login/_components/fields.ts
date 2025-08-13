import { InputField } from "@/types/input";

interface StaffLoginField extends InputField {
  name: "email" | "username" | "pin";
}

export const staffLoginFields: StaffLoginField[] = [
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email address",
    inputType: "email",
  },
  {
    name: "username",
    label: "Username (Optional)",
    placeholder: "Or enter your username",
    inputType: "text",
  },
  {
    name: "pin",
    label: "PIN",
    placeholder: "Enter your 4-6 digit PIN",
    inputType: "password",
  },
];
