import React from 'react';
import { OrgSwitcher } from '@/components/common/OrgSwitcher';
import { useOrgAccounts, useOrgContacts, useOrgLeads } from '@/hooks/useOrgAwareQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Target, TrendingUp } from 'lucide-react';

export const OrgSwitcherTest: React.FC = () => {
  // Use org-aware query hooks - these automatically include selectedOrg
  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useOrgAccounts();
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useOrgContacts();
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useOrgLeads();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Switcher Test</h1>
          <p className="text-muted-foreground">
            Test the org switcher functionality. Data will automatically filter based on selected organization.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accounts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ) : accountsError ? (
              <div className="text-sm text-destructive">
                Error loading accounts
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{accounts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Accounts in selected organization
                </p>
                {accounts && accounts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {accounts.slice(0, 3).map((account) => (
                      <Badge key={account.id} variant="secondary" className="text-xs">
                        {account.companyName}
                      </Badge>
                    ))}
                    {accounts.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{accounts.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ) : contactsError ? (
              <div className="text-sm text-destructive">
                Error loading contacts
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{contacts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Contacts in selected organization
                </p>
                {contacts && contacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contacts.slice(0, 3).map((contact) => (
                      <Badge key={contact.id} variant="secondary" className="text-xs">
                        {contact.firstName} {contact.lastName}
                      </Badge>
                    ))}
                    {contacts.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contacts.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ) : leadsError ? (
              <div className="text-sm text-destructive">
                Error loading leads
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{leads?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Leads in selected organization
                </p>
                {leads && leads.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {leads.slice(0, 3).map((lead) => (
                      <Badge key={lead.id} variant="secondary" className="text-xs">
                        {lead.name || `${lead.firstName} ${lead.lastName}`}
                      </Badge>
                    ))}
                    {leads.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{leads.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
          <CardDescription>
            This test demonstrates the organization switcher functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Backend Changes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• All API endpoints accept `selectedOrg` parameter</li>
                <li>• Backend validates org access permissions</li>
                <li>• Data filtered by selected organization</li>
                <li>• Defaults to first accessible org if none selected</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Frontend Changes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• OrgSwitcher component manages selection</li>
                <li>• useOrgStore persists selected org</li>
                <li>• Query hooks automatically include selectedOrg</li>
                <li>• Data refreshes when org changes</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">API Call Examples:</h4>
            <div className="space-y-2 text-sm font-mono text-muted-foreground">
              <div>GET /api/accounts?selectedOrg=6844518f-22f2-458f-afbb-74acb41c4b20</div>
              <div>GET /api/contacts?selectedOrg=6844518f-22f2-458f-afbb-74acb41c4b20</div>
              <div>GET /api/leads?selectedOrg=6844518f-22f2-458f-afbb-74acb41c4b20</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
