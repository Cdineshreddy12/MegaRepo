import React from 'react';
import styled from 'styled-components';
import { PricingCardProps } from '@/types/pricing';

const PricingCard: React.FC<PricingCardProps> = ({
  name,
  description,
  credits,
  price,
  currency,
  features,
  validityMonths,
  recommended = false,
  onPurchase,
  isLoading = false,
  monthlyPrice,
  annualPrice,
  freeCredits,
  type = 'topup'
}) => {
  const isTopupCard = type === 'topup';

  return (
    <StyledWrapper>
      {recommended && !isTopupCard && (
        <div className="recommended-badge">
          <span>Most Popular</span>
        </div>
      )}
      <div className={`card ${isTopupCard ? 'premium-card' : ''}`}>
        {isTopupCard && recommended && (
          <span className="premium-ribbon"></span>
        )}
        <div className="card__border" />
        <div className="card_title__container">
          <span className="card_title">{name}</span>
          <p className="card_paragraph">
            {description}
          </p>
        </div>
        <hr className="line" />
        <div className="pricing-section">
          {type === 'application' ? (
            <>
              <div className="price-display">
                <span className="price">${monthlyPrice}</span>
                <span className="currency">/month</span>
              </div>
              <div className="credits-info">
                {freeCredits?.toLocaleString()} Free Credits/month
              </div>
              <div className="validity-info">
                Annual billing available
              </div>
            </>
          ) : (
            <>
              <div className="price-display">
                <span className="price">${price}</span>
                <span className="currency"> one-time</span>
              </div>
              <div className="credits-info">
                {credits?.toLocaleString()} Credits
              </div>
              <div className="validity-info">
                Credits never expire
              </div>
            </>
          )}
        </div>
        <hr className="line" />
        <ul className="card__list">
          {features.map((feature, index) => (
            <li key={index} className="card__list_item">
              <span className="check">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="check_svg">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="list_text">{feature}</span>
            </li>
          ))}
        </ul>
        <button
          className={`button ${recommended ? 'recommended' : ''}`}
          onClick={onPurchase}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : `Purchase ${name}`}
        </button>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: relative;

  .recommended-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;

    span {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      display: inline-block;
    }
  }

  .card {
    --white: hsl(0, 0%, 100%);
    --black: hsl(240, 15%, 9%);
    --paragraph: hsl(0, 0%, 83%);
    --line: hsl(240, 9%, 17%);
    --primary: hsl(266, 92%, 58%);
    --primary-recommended: hsl(266, 92%, 65%);

    position: relative;

    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: space-between;

    padding: 2rem 1rem;
    width: 130%;
    max-width: 600px;
    min-height: 360px;
    margin: 0 auto;
    background-color: hsla(240, 15%, 9%, 1);
    background-image: radial-gradient(
        at 88% 40%,
        hsla(240, 15%, 9%, 1) 0px,
        transparent 85%
      ),
      radial-gradient(at 49% 30%, hsla(240, 15%, 9%, 1) 0px, transparent 85%),
      radial-gradient(at 14% 26%, hsla(240, 15%, 9%, 1) 0px, transparent 85%),
      radial-gradient(at 0% 64%, hsla(263, 93%, 56%, 1) 0px, transparent 85%),
      radial-gradient(at 41% 94%, hsla(284, 100%, 84%, 1) 0px, transparent 85%),
      radial-gradient(at 100% 99%, hsla(306, 100%, 57%, 1) 0px, transparent 85%);

    border-radius: 1rem;
    box-shadow: 0px -16px 24px 0px rgba(255, 255, 255, 0.25) inset;

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      --white: hsl(0, 0%, 95%);
      --black: hsl(240, 15%, 15%);
      --paragraph: hsl(0, 0%, 75%);
      --line: hsl(240, 9%, 25%);

      background-color: hsla(240, 15%, 15%, 1);
      background-image: radial-gradient(
          at 88% 40%,
          hsla(240, 15%, 15%, 1) 0px,
          transparent 85%
        ),
        radial-gradient(at 49% 30%, hsla(240, 15%, 15%, 1) 0px, transparent 85%),
        radial-gradient(at 14% 26%, hsla(240, 15%, 15%, 1) 0px, transparent 85%),
        radial-gradient(at 0% 64%, hsla(263, 93%, 56%, 1) 0px, transparent 85%),
        radial-gradient(at 41% 94%, hsla(284, 100%, 84%, 1) 0px, transparent 85%),
        radial-gradient(at 100% 99%, hsla(306, 100%, 57%, 1) 0px, transparent 85%);
    }
  }

  .card .card__border {
    overflow: hidden;
    pointer-events: none;

    position: absolute;
    z-index: -10;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    width: calc(100% + 2px);
    height: calc(100% + 2px);
    background-image: linear-gradient(
      0deg,
      hsl(0, 0%, 100%) -50%,
      hsl(0, 0%, 40%) 100%
    );

    border-radius: 1rem;
  }

  .card .card__border::before {
    content: "";
    pointer-events: none;

    position: fixed;
    z-index: 200;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%), rotate(0deg);
    transform-origin: left;

    width: 200%;
    height: 10rem;
    background-image: linear-gradient(
      0deg,
      hsla(0, 0%, 100%, 0) 0%,
      hsl(277, 95%, 60%) 40%,
      hsl(277, 95%, 60%) 60%,
      hsla(0, 0%, 40%, 0) 100%
    );

    animation: rotate 8s linear infinite;
  }

  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }

  .card .card_title__container .card_title {
    font-size: 1rem;
    color: var(--white);
    font-weight: 600;
  }

  .card .card_title__container .card_paragraph {
    margin-top: 0.25rem;
    width: 100%;
    font-size: 0.5rem;
    color: var(--paragraph);
    line-height: 1.4;
  }

  .card .line {
    width: 100%;
    height: 0.1rem;
    background-color: var(--line);
    border: none;
  }

  .pricing-section {
    text-align: center;
    padding: 0.5rem 0;
  }

  .price-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .price {
    font-size: 2rem;
    font-weight: 700;
    color: var(--white);
  }

  .currency {
    font-size: 0.875rem;
    color: var(--paragraph);
  }

  .credits-info {
    font-size: 0.75rem;
    color: var(--white);
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .validity-info {
    font-size: 0.5rem;
    color: var(--paragraph);
  }

  .card .card__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .card .card__list .card__list_item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card .card__list .card__list_item .check {
    display: flex;
    justify-content: center;
    align-items: center;

    width: 1rem;
    height: 1rem;
    background-color: var(--primary);

    border-radius: 50%;
  }

  .card .card__list .card__list_item .check .check_svg {
    width: 0.75rem;
    height: 0.75rem;

    fill: var(--black);
  }

  .card .card__list .card__list_item .list_text {
    font-size: 0.75rem;
    color: var(--white);
    flex: 1;
  }

  .card .button {
    cursor: pointer;

    padding: 0.5rem;
    width: 100%;
    background-image: linear-gradient(
      0deg,
      rgba(94, 58, 238, 1) 0%,
      rgba(197, 107, 240, 1) 100%
    );

    font-size: 0.75rem;
    color: var(--white);

    border: 0;
    border-radius: 9999px;
    box-shadow: inset 0 -2px 25px -4px var(--white);
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: inset 0 -2px 25px -4px var(--white), 0 4px 12px rgba(94, 58, 238, 0.3);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &.recommended {
      background-image: linear-gradient(
        0deg,
        rgba(139, 92, 246, 1) 0%,
        rgba(236, 72, 153, 1) 100%
      );
    }

    /* Dark mode adjustments */
    @media (prefers-color-scheme: dark) {
      box-shadow: inset 0 -2px 25px -4px var(--white);

      &:hover:not(:disabled) {
        box-shadow: inset 0 -2px 25px -4px var(--white), 0 4px 12px rgba(94, 58, 238, 0.4);
      }
    }
  }

  /* Premium Card Styles - Complete override */
  .card.premium-card {
    background: linear-gradient(170deg, rgba(58, 56, 56, 0.623) 0%, rgb(31, 31, 31) 100%);
    box-shadow: 0 25px 50px rgba(0,0,0,0.55);
    border-radius: 20px;
    position: relative;
    width: 130%;
    max-width: 500px;
    min-height: 380px;
    margin: 0 auto;
    padding: 2rem 1.75rem;

    /* Dark mode support for premium cards */
    @media (prefers-color-scheme: dark) {
      background: linear-gradient(170deg, rgba(45, 45, 45, 0.8) 0%, rgb(20, 20, 20) 100%);
      box-shadow: 0 25px 50px rgba(0,0,0,0.7);
    }

    /* Light mode support for premium cards */
    @media (prefers-color-scheme: light) {
      background: linear-gradient(170deg, rgba(255, 255, 255, 0.95) 0%, rgb(248, 248, 248) 100%);
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    /* Flex layout for content */
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: space-between;

    &:hover {
      transform: translateY(-8px) scale(1.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .premium-ribbon {
      position: absolute;
      overflow: hidden;
      width: 180px;
      height: 180px;
      top: -10px;
      left: -10px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10; /* Ensure ribbon appears above content */

      &::before {
        content: 'Premium';
        position: absolute;
        width: 150%;
        height: 40px;
        background-image: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%);
        transform: rotate(-45deg) translateY(-20px);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        box-shadow: 0 5px 10px rgba(0,0,0,0.23);
      }

      &::after {
        content: '';
        position: absolute;
        width: 10px;
        bottom: 0;
        left: 0;
        height: 10px;
        z-index: -1;
        box-shadow: 140px -140px #cc3f47;
        background-image: linear-gradient(45deg, #FF512F 0%, #F09819 51%, #FF512F 100%);
      }
    }

    .card_title {
      color: #fff;
      margin-top: 30px;
      font-size: 1.25rem;
      font-weight: 600;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #1a1a1a;
      }
    }

    .card_paragraph {
      color: #ccc;
      margin-bottom: 1rem;
      line-height: 1.4;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #666;
      }
    }

    .price {
      color: #fff;
      font-size: 2rem;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #1a1a1a;
      }
    }

    .currency {
      color: #ccc;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #666;
      }
    }

    .credits-info,
    .validity-info {
      color: #ccc;
      font-size: 0.9rem;
      margin: 0.25rem 0;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #666;
      }
    }

    .card__list {
      margin-top: 1rem;
    }

    .card__list_item {
      color: #fff;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;

      /* Light mode text colors */
      @media (prefers-color-scheme: light) {
        color: #333;
      }
    }

    .card_title__container {
      margin-bottom: 0.5rem;
    }

    .pricing-section {
      margin: 1rem 0;
    }

    .line {
      margin: 0.5rem 0;
    }

    /* Ensure child elements are properly contained */
    .card__border {
      display: none; /* Hide the border element for premium cards */
    }

    .button {
      margin-top: auto; /* Push button to bottom */
      width: 100%;
      background: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%);
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;

      /* Light mode button styling */
      @media (prefers-color-scheme: light) {
        background: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%);
        color: white;
      }

      &:hover:not(:disabled) {
        background: linear-gradient(45deg, #ff512f 0%, #f09819 51%, #ff512f 100%);
        transform: translateY(-2px);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
  }

  /* Card entrance animations */
  @keyframes slide-in-up {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-slide-in-up {
    animation: slide-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    opacity: 0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .card {
      max-width: 480px;
      min-height: 360px;
      padding: 1.75rem 1.25rem;
      margin: 0 auto;
    }

    .card.premium-card {
      max-width: 380px;
      min-height: 360px;
      padding: 1.75rem 1.25rem;
      margin: 0 auto;
    }

    .price {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 640px) {
    .card {
      max-width: 460px;
      min-height: 340px;
      padding: 1.5rem 1rem;
      margin: 0 auto;
    }

    .card.premium-card {
      max-width: 360px;
      min-height: 340px;
      padding: 1.5rem 1rem;
      margin: 0 auto;
    }

    .price {
      font-size: 1.5rem;
    }
  }
`;

export default PricingCard;
