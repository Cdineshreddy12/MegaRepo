import { DollarSign, Coins, TrendingUp } from 'lucide-react';
import { IconButton } from '@/components/common/LoadingButton';
import { Container, Flex, Grid } from '@/components/common/Page';
import { Typography } from '@/components/common/Typography';
import { CreditBalance } from '@/components/CreditBalance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export function CreditsPage() {
    return (
        <Container>
            <Flex align="center" justify="between" gap={6}>
                <Flex direction="col">
                    <Typography variant="h3">Credit Management</Typography>
                    <Typography variant="muted">Monitor your credit balance, usage, and purchase history</Typography>
                </Flex>
                <IconButton
                    variant="outline"
                    onClick={() => window.location.href = '/billing?purchase=true'}
                    startIcon={Coins}
                >
                    Purchase Credits
                </IconButton>
            </Flex>

            <CreditBalance
                showPurchaseButton={true}
                showUsageStats={true}
                compact={false}
                onPurchaseClick={() => {
                    window.location.href = '/billing?purchase=true';
                }}
            />

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common credit-related tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <Grid columns={{ xs: 1, sm: 2, md: 3 }} gap={4}>
                        <IconButton
                            variant="outline"
                            onClick={() => window.location.href = '/billing?purchase=true'}
                            startIcon={Coins}
                        >
                            Purchase Credits
                        </IconButton>
                        <IconButton
                            variant="outline"
                            onClick={() => window.location.href = '/billing?history=true'}
                            startIcon={TrendingUp}
                        >
                            Usage History
                        </IconButton>
                        <IconButton
                            variant="outline"
                            onClick={() => window.location.href = '/billing'}
                            startIcon={DollarSign}
                        >
                            Billing & Plans
                        </IconButton>
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    )
}

export default CreditsPage
