import { syncBusinessFeatureFlags } from '../../src/modules/platform-feature-flag/platform-feature-flag.service';

type SyncClient = NonNullable<Parameters<typeof syncBusinessFeatureFlags>[2]>;
type SyncClientWithOverrideProbe = SyncClient & {
  businessFeatureFlagOverride: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
};

function makeMockClient(
  allFlags: { id: string }[],
  planFlagIds: string[]
): SyncClientWithOverrideProbe {
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
    businessFeatureFlagOverride: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
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

    await syncBusinessFeatureFlags(businessId, planId, client);

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

    await syncBusinessFeatureFlags(businessId, planId, client);

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

    await syncBusinessFeatureFlags(businessId, planId, client);

    expect(client.businessFeatureFlag.upsert).toHaveBeenCalledTimes(2);
    for (const call of client.businessFeatureFlag.upsert.mock.calls) {
      expect(call[0].update).toEqual({ enabled: true });
      expect(call[0].create.enabled).toBe(true);
    }
  });

  it('does nothing when there are no feature flags at all', async () => {
    const client = makeMockClient([], []);

    await syncBusinessFeatureFlags(businessId, planId, client);

    expect(client.businessFeatureFlag.upsert).not.toHaveBeenCalled();
  });

  it('passes businessId and featureFlagId correctly in upsert', async () => {
    const client = makeMockClient([{ id: 'flag-z' }], ['flag-z']);

    await syncBusinessFeatureFlags('biz-99', 'plan-99', client);

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

    await syncBusinessFeatureFlags(businessId, 'target-plan', client);

    expect(client.planFeatureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: 'target-plan' },
      })
    );
  });

  it('leaves manual override storage untouched while syncing plan base flags', async () => {
    const client = makeMockClient([{ id: 'flag-a' }, { id: 'flag-b' }], ['flag-a']);

    await syncBusinessFeatureFlags(businessId, planId, client);

    expect(client.businessFeatureFlagOverride.findUnique).not.toHaveBeenCalled();
    expect(client.businessFeatureFlagOverride.upsert).not.toHaveBeenCalled();
    expect(client.businessFeatureFlagOverride.delete).not.toHaveBeenCalled();
  });
});
