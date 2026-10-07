// Rewarded ads that unlock hints (Google AdMob).
// An ad is preloaded in the background so the Hint button responds instantly.
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { sound } from '../audio/sound';

/**
 * Your production rewarded ad unit IDs from the AdMob console
 * (Apps → LightsIt → Ad units → Rewarded). While these are empty, or in
 * development builds, Google's test ads are used, which is safe to click.
 * Also replace the test app IDs in app.json before releasing.
 */
const PRODUCTION_UNIT_IDS = {
  android: '',
  ios: '',
};

const prodUnit =
  Platform.OS === 'ios' ? PRODUCTION_UNIT_IDS.ios : PRODUCTION_UNIT_IDS.android;
const AD_UNIT_ID = !__DEV__ && prodUnit ? prodUnit : TestIds.REWARDED;
const LOAD_TIMEOUT_MS = 6000;

export type AdResult = 'rewarded' | 'skipped' | 'unavailable';

class RewardedHintAds {
  private ad: RewardedAd | null = null;
  private loaded = false;
  private loading = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private waiters: ((ok: boolean) => void)[] = [];
  private showing = false;

  async init() {
    try {
      await mobileAds().initialize();
    } catch (e) {
      console.warn('[ads] init failed', e);
    }
    this.preload();
  }

  private settle(ok: boolean) {
    this.waiters.splice(0).forEach(w => w(ok));
  }

  private preload() {
    if (this.loading || this.loaded || this.showing) return;
    this.loading = true;
    const ad = RewardedAd.createForAdRequest(AD_UNIT_ID);
    this.ad = ad;
    const offLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.loaded = true;
      this.loading = false;
      this.retry = 0;
      this.settle(true);
    });
    const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
      if (this.showing) return;
      offLoaded();
      offError();
      this.loaded = false;
      this.loading = false;
      this.ad = null;
      this.settle(false);
      // Back off: 5s, 10s, 20s ... capped at 60s.
      const delay = Math.min(60000, 5000 * 2 ** this.retry++);
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.preload(), delay);
    });
    ad.load();
  }

  private waitForLoad(): Promise<boolean> {
    if (this.loaded) return Promise.resolve(true);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.preload();
    return new Promise(resolve => {
      const t = setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);
      this.waiters.push(ok => {
        clearTimeout(t);
        resolve(ok);
      });
    });
  }

  /** Shows a rewarded ad. Resolves once it closes (or can't be shown). */
  async show(): Promise<AdResult> {
    if (this.showing) return 'skipped';
    const ready = await this.waitForLoad();
    const ad = this.ad;
    if (!ready || !ad) return 'unavailable';

    this.showing = true;
    this.loaded = false;
    let earned = false;

    return new Promise<AdResult>(resolve => {
      const subs: (() => void)[] = [];
      const finish = (result: AdResult) => {
        subs.forEach(off => off());
        ad.removeAllListeners();
        this.ad = null;
        this.showing = false;
        sound.resume();
        resolve(result);
        this.preload(); // get the next one ready
      };
      subs.push(
        ad.addAdEventListener(AdEventType.OPENED, () => sound.pause()),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () =>
          finish(earned ? 'rewarded' : 'skipped'),
        ),
        ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')),
      );
      ad.show().catch(() => finish('unavailable'));
    });
  }
}

export const rewardedHint = new RewardedHintAds();
