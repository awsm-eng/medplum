import { Communication } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react-hooks';
import { IconMail } from '@tabler/icons-react';
import 'jest-websocket-mock';
import { act, render, screen, waitFor } from '../test-utils/render';
import { NotificationIcon } from './NotificationIcon';

describe('NotificationIcon()', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('Criteria changed', async () => {
    const medplum = new MockClient();

    render(
      <MedplumProvider medplum={medplum}>
        <NotificationIcon
          label="Mail"
          resourceType="Communication"
          countCriteria={`recipient=Practitioner/123&status:not=completed&_summary=count`}
          subscriptionCriteria={`Communication?recipient=Practitioner/123`}
          iconComponent={<IconMail />}
          onClick={() => console.log('foo')}
        />
      </MedplumProvider>
    );

    // On first render, the count should be zero, so no indicator should be shown
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    // Create a communication
    const communication = await medplum.createResource<Communication>({
      resourceType: 'Communication',
      status: 'in-progress',
      recipient: [{ reference: 'Practitioner/123' }],
    });

    // Emulate the server sending a message
    await act(async () => {
      medplum.getSubscriptionManager().emitEventForCriteria<'message'>('Communication?recipient=Practitioner/123', {
        type: 'message',
        payload: { resourceType: 'Bundle', id: communication.id, type: 'history' },
      });
    });

    // Wait for the indicator to change
    await waitFor(() => screen.getByText('1'));

    // After emitting a message, the count should be 1, and the indicator should be shown
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
