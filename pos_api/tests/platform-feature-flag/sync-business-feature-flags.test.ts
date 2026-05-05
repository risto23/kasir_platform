import { syncBusinessFeatureFlags } from '../../src/modules/platform-feature-flag/platform-feature-flag.service';

type MockClient = {
  featureFlag: { findMany: jest.Mock };
  planFeatureFlag: { findMany: jest.Mock };
  businessFeatureFlag: { upsert: jest.Mock };
};

function makeMockClient(
  allFlags: { id: string }[],
  planFlagIds: string[]
): MockClient {
  return {
    featureFlag: {
      findMany: jest.fn().mockResolvedValue(allFlags),
    },
    planFeatureFlag: {
      findMany: jest.fn().mockResolvedValue(planFlagIds.map((id) => ({ featureFlagId: id }))),
    },
    businessFeatureFlag: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('syncBusinessFeatureFlags', () => {
  const businessId = 'biz-1';
  const planId = 'plan-1';

  it('enables flags that belong to the plan and disables others', async () => {
    const client = makeMockClient(
      [{ id: 'flag-a' }, { id: 'flag-b' }, { id: 'flag-c' }],
      ['flag-a', 'flag-b']
    );

    await syncBusinessFeatureFlags(businessId, planId, client as any);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledTimes(3);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_featureFlagId: { businessId, featureFlagId: 'flag-a' } },
        create: expect.objectContaining({ enabled: true }),
        update: { enabled: true },
      })
    );
    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_featureFlagId: { businessId, featureFlagId: 'flag-b' } },
        create: expect.objectContaining({ enabled: true }),
        update: { enabled: true },
      })
    );
    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_featureFlagId: { businessId, featureFlagId: 'flag-c' } },
        create: expect.objectContaining({ enabled: false }),
        update: { enabled: false },
      })
    );
  });

  it('disables all flags when plan has no feature flags', async () => {
    const client = makeMockClient([{ id: 'flag-a' }, { id: 'flag-b' }], []);

    await syncBusinessFeatureFlags(businessId, planId, client as any);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledTimes(2);
    for (const call of client.businessFeatureFlag.upsert.mock.calls) {
      expect(call[0].update).toEqual({ enabled: false });
      expect(call[0].create.enabled).toBe(false);
    }
  });

  it('enables all flags when all are in the plan', async () => {
    const client = makeMockClient(
      [{ id: 'flag-x' }, { id: 'flag-y' }],
      ['flag-x', 'flag-y']
    );

    await syncBusinessFeatureFlags(businessId, planId, client as any);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledTimes(2);
    for (const call of client.businessFeatureFlag.upsert.mock.calls) {
      expect(call[0].update).toEqual({ enabled: true });
      expect(call[0].create.enabled).toBe(true);
    }
  });

  it('does nothing when there are no feature flags at all', async () => {
    const client = makeMockClient([], []);

    await syncBusinessFeatureFlags(businessId, planId, client as any);

    expect(client.businessFeatureFlag.upsert).not.toHaveBeenCalled();
  });

  it('passes businessId and featureFlagId correctly in upsert', async () => {
    const client = makeMockClient([{ id: 'flag-z' }], ['flag-z']);

    await syncBusinessFeatureFlags('biz-99', 'plan-99', client as any);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId_featureFlagId: {
            businessId: 'biz-99',
            featureFlagId: 'flag-z',
          },
        },
        create: expect.objectContaining({
          businessId: 'biz-99',
          featureFlagId: 'flag-z',
        }),
      })
    );
  });

  it('queries planFeatureFlag with the correct planId', async () => {
    const client = makeMockClient([], []);

    await syncBusinessFeatureFlags(businessId, 'target-plan', client as any);

    expect(client.planFeatureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: 'target-plan' },
      })
    );
  });
});
