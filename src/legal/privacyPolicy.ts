// Single source for the privacy policy. Used by the in-app Privacy screen and by
// scripts/build-privacy-html.mts, which writes docs/privacy-policy.html for hosting.
// Pure data, no React Native imports.

/* ======== Fill these in before publishing (the HTML build warns if not) ======== */
export const POLICY = {
  appName: 'LightsIt',
  contactEmail: 'shishupalsingh1947@gmail.com',
  effectiveDate: 'October 8, 2026',
  /** Public URL where docs/privacy-policy.html is hosted (paste this into Play Console). */
  url: '[YOUR PRIVACY POLICY URL]',
};
/* =============================================================================== */

export interface Section {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Paragraphs shown after the bullet list. */
  after?: string[];
}

const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';
const GOOGLE_PARTNERS =
  'https://policies.google.com/technologies/partner-sites';
const GOOGLE_ADS_SETTINGS = 'https://adssettings.google.com';

export const SECTIONS: Section[] = [
  {
    heading: 'Overview',
    paragraphs: [
      `This Privacy Policy explains how ${POLICY.appName} (“the app”, “we”, “us”) handles information when you use the app on Android or iOS.`,
      'In short: we do not run any servers, we do not ask you to create an account, and we do not collect your personal information ourselves. The app shows optional rewarded ads through Google AdMob, and Google may collect some device information to deliver those ads, as described below.',
    ],
  },
  {
    heading: 'Information stored on your device',
    paragraphs: [
      'The app saves a small amount of data locally on your device so your game is remembered between sessions:',
    ],
    bullets: [
      'Your level progress and the stars you have earned',
      'Which tutorial cards you have already seen',
      'Your music and sound-effect settings',
    ],
    after: [
      'This data never leaves your device and is not sent to us or anyone else. You can delete it at any time by clearing the app’s storage in your device settings or by uninstalling the app.',
    ],
  },
  {
    heading: 'Advertising (Google AdMob)',
    paragraphs: [
      'When you tap the Hint button you can choose to watch a rewarded video ad to unlock a hint. Ads are provided by Google AdMob, a service of Google LLC. To load, show and measure ads, and to prevent fraud, the Google Mobile Ads SDK may automatically collect information such as:',
    ],
    bullets: [
      'Your device’s advertising ID (Android Advertising ID or Apple IDFA, where permitted)',
      'IP address, and an approximate location derived from it',
      'Device and operating-system information (for example model, OS version and language)',
      'Information about your interaction with ads (for example views, clicks and completions)',
      'Diagnostic and performance data related to ad delivery',
    ],
  },
  {
    heading: 'How Google uses this information',
    paragraphs: [
      `Google’s use of this information is governed by the Google Privacy Policy (${GOOGLE_PRIVACY}). You can learn how Google uses information from apps that use its services at ${GOOGLE_PARTNERS}.`,
      'Depending on your region and your choices, ads may be personalized (based on your interests) or non-personalized.',
    ],
  },
  {
    heading: 'Your choices',
    bullets: [
      'Watching ads is always optional: you only see an ad when you tap Hint, and the rest of the game works without ads.',
      'On Android, you can reset or delete your advertising ID, or opt out of ad personalization, in Settings › Google › Ads (or Settings › Privacy › Ads on some devices).',
      'On iOS, you can control ad tracking in Settings › Privacy & Security › Tracking.',
      `You can manage how Google personalizes ads at ${GOOGLE_ADS_SETTINGS}.`,
    ],
  },
  {
    heading: 'Device permissions',
    paragraphs: ['The app requests only the permissions it needs:'],
    bullets: [
      'Internet and network state: to load ads.',
      'Advertising ID and related ad-services permissions: used by the Google Mobile Ads SDK.',
      'Vibration: for haptic feedback when you place pieces and solve levels.',
      'Wake lock / background work: used internally by the Google Mobile Ads SDK.',
    ],
    after: [
      'The app does not access your camera, microphone, contacts, photos, files or precise location.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      `${POLICY.appName} is not directed at children under the age of 13, and we do not knowingly collect personal information from children. If you believe a child has provided personal information through the app, please contact us and we will help address it.`,
    ],
  },
  {
    heading: 'Data security and retention',
    paragraphs: [
      'Because we do not collect personal information ourselves, we do not store any on our own systems. Game data stays on your device until you delete it. Information collected by Google through AdMob is kept according to Google’s own retention policies.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      'Depending on where you live (for example in the EU, UK or California), you may have rights to access, correct, delete or object to the processing of your personal information. As we do not hold personal data about you, requests about advertising data are best directed to Google using the links above. You are also welcome to contact us with any question.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time, for example if we add new features. The updated version will be posted at the same address with a new effective date, and it will also be available inside the app.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      `If you have any questions about this Privacy Policy, contact us at ${POLICY.contactEmail}.`,
    ],
  },
];

/** Placeholders that must be replaced before publishing. */
export const unfilledFields = () =>
  Object.entries(POLICY)
    .filter(([, v]) => /^\[.*\]$/.test(v))
    .map(([k]) => k);
