import { Container, Flex } from '@/components/common/Page';
import { Typography } from '@/components/common/Typography';
import { CreditConfigurationScreen } from '../components/credit-configuration';

export default function AdminDashboard() {
  return (
    <Container>
      <Flex direction="col" gap={2}>
        <Typography variant="h3">Credit Configuration</Typography>
        <Typography variant="muted">
          Manage credit configurations for all tenants
        </Typography>
      </Flex>

      <CreditConfigurationScreen />
    </Container>
  );
}
