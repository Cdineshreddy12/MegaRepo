import React from "react";
import { User } from "@/types/user-management";
import UserAvatar, { UserAvatarPresets } from "./UserAvatar";
import { Section } from "./Page/Section";

// Example users for demonstration
const exampleUsers: User[] = [
  {
    userId: "1",
    email: "john.doe@example.com",
    name: "John Doe",
    isActive: true,
    isTenantAdmin: false,
    onboardingCompleted: true,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    roles: []
  },
  {
    userId: "2", 
    email: "jane.smith@example.com",
    name: "Jane Smith",
    isActive: true,
    isTenantAdmin: true,
    onboardingCompleted: true,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    roles: []
  },
  {
    userId: "3",
    email: "bob.wilson@example.com", 
    name: "Bob Wilson",
    isActive: false,
    isTenantAdmin: false,
    onboardingCompleted: false,
    roles: []
  },
  {
    userId: "4",
    email: "alice.johnson@example.com",
    name: "Alice Johnson",
    isActive: true,
    isTenantAdmin: false,
    onboardingCompleted: true,
    roles: []
  }
];

export const UserAvatarExamples = () => {
  return (
    <div className="space-y-8 p-6">
      <Section title="UserAvatar Component Examples" description="Various configurations and use cases">
        <div className="space-y-6">
          
          {/* Basic Sizes */}
          <Section title="Different Sizes" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="xs" />
                <p className="text-xs mt-1">XS</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="sm" />
                <p className="text-xs mt-1">SM</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="md" />
                <p className="text-xs mt-1">MD</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="lg" />
                <p className="text-xs mt-1">LG</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="xl" />
                <p className="text-xs mt-1">XL</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} size="2xl" />
                <p className="text-xs mt-1">2XL</p>
              </div>
            </div>
          </Section>

          {/* Status Indicators */}
          <Section title="Status Indicators" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <UserAvatar user={exampleUsers[0]} showStatus status="online" />
                <p className="text-xs mt-1">Online</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[1]} showStatus status="away" />
                <p className="text-xs mt-1">Away</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[2]} showStatus status="busy" />
                <p className="text-xs mt-1">Busy</p>
              </div>
              <div className="text-center">
                <UserAvatar user={exampleUsers[3]} showStatus status="offline" />
                <p className="text-xs mt-1">Offline</p>
              </div>
            </div>
          </Section>

          {/* With Tooltips */}
          <Section title="With Tooltips" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <UserAvatar 
                user={exampleUsers[0]} 
                showTooltip 
                tooltipContent="John Doe - Software Engineer"
              />
              <UserAvatar 
                user={exampleUsers[1]} 
                showTooltip 
                tooltipContent="Jane Smith - Product Manager"
              />
              <UserAvatar 
                user={exampleUsers[2]} 
                showTooltip 
                tooltipContent="Bob Wilson - Designer"
              />
            </div>
          </Section>

          {/* Clickable Avatars */}
          <Section title="Clickable Avatars" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <UserAvatar 
                user={exampleUsers[0]} 
                onClick={() => alert('Clicked on John!')}
                showTooltip
              />
              <UserAvatar 
                user={exampleUsers[1]} 
                onClick={() => alert('Clicked on Jane!')}
                showTooltip
              />
              <UserAvatar 
                user={exampleUsers[2]} 
                onClick={() => alert('Clicked on Bob!')}
                showTooltip
              />
            </div>
          </Section>

          {/* Fallback Scenarios */}
          <Section title="Fallback Scenarios" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <UserAvatar user={null} />
                <p className="text-xs mt-1">Null User</p>
              </div>
              <div className="text-center">
                <UserAvatar user={undefined} />
                <p className="text-xs mt-1">Undefined User</p>
              </div>
              <div className="text-center">
                <UserAvatar user={{...exampleUsers[0], name: "", avatar: ""}} />
                <p className="text-xs mt-1">No Name/Avatar</p>
              </div>
              <div className="text-center">
                <UserAvatar user={{...exampleUsers[0], name: "A", avatar: ""}} />
                <p className="text-xs mt-1">Single Letter</p>
              </div>
            </div>
          </Section>

          {/* Preset Variants */}
          <Section title="Preset Variants" size="sm" variant="filled">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">ListItem (for user lists)</h4>
                <div className="flex items-center gap-2">
                  <UserAvatarPresets.ListItem user={exampleUsers[0]} />
                  <UserAvatarPresets.ListItem user={exampleUsers[1]} />
                  <UserAvatarPresets.ListItem user={exampleUsers[2]} />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Card (for user cards)</h4>
                <div className="flex items-center gap-2">
                  <UserAvatarPresets.Card user={exampleUsers[0]} />
                  <UserAvatarPresets.Card user={exampleUsers[1]} />
                  <UserAvatarPresets.Card user={exampleUsers[2]} />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Header (for page headers)</h4>
                <div className="flex items-center gap-2">
                  <UserAvatarPresets.Header user={exampleUsers[0]} />
                  <UserAvatarPresets.Header user={exampleUsers[1]} />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Profile (for profile pages)</h4>
                <div className="flex items-center gap-2">
                  <UserAvatarPresets.Profile user={exampleUsers[0]} />
                </div>
              </div>
            </div>
          </Section>

          {/* Custom Styling */}
          <Section title="Custom Styling" size="sm" variant="filled">
            <div className="flex items-center gap-4">
              <UserAvatar 
                user={exampleUsers[0]} 
                className="ring-2 ring-blue-500 ring-offset-2"
                showStatus
                status="online"
              />
              <UserAvatar 
                user={exampleUsers[1]} 
                className="border-4 border-green-500"
                showStatus
                status="away"
              />
              <UserAvatar 
                user={exampleUsers[2]} 
                className="shadow-lg"
                showStatus
                status="busy"
              />
            </div>
          </Section>

        </div>
      </Section>
    </div>
  );
};

export default UserAvatarExamples;
