import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <Image src="/brand/twilio-logo.svg" alt="Twilio" width={110} height={40} className={className} priority />
  );
}
