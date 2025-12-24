import { Container, Flex } from '@/components/common/Page';
import { Typography } from '@/components/common/Typography';
import { CreditConfigurationScreen } from '../components/credit-configuration';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Container>
        <Flex direction="col" gap={2}>
          <Typography variant="h3">Credit Configuration</Typography>
          <Typography variant="muted">
            Manage credit configurations for all tenants
          </Typography>
        </Flex>

        <CreditConfigurationScreen />
      </Container>
    </motion.div>
  );
}
