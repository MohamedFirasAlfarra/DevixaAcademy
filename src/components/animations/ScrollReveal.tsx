import { useEffect, useRef, useMemo, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
    children: ReactNode;
    scrollContainerRef?: React.RefObject<HTMLElement>;
    enableBlur?: boolean;
    baseOpacity?: number;
    baseRotation?: number;
    blurStrength?: number;
    containerClassName?: string;
    textClassName?: string;
    rotationEnd?: string;
    wordAnimationEnd?: string;
}

const ScrollReveal = ({
    children,
    scrollContainerRef,
    enableBlur = true,
    baseOpacity = 0.1,
    baseRotation = 3,
    blurStrength = 4,
    containerClassName = '',
    textClassName = '',
    rotationEnd = 'bottom bottom',
    wordAnimationEnd = 'bottom bottom'
}: ScrollRevealProps) => {
    const containerRef = useRef<HTMLHeadingElement>(null);

    const splitText = useMemo(() => {
        const text = typeof children === 'string' ? children : '';
        if (!text) return children;

        return text.split(/(\s+)/).map((word, index) => {
            if (word.match(/^\s+$/)) return word;
            return (
                <span className="word" key={index}>
                    {word}
                </span>
            );
        });
    }, [children]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const scroller = scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

        const ctx = gsap.context(() => {
            // Rotation animation for the container
            gsap.fromTo(
                el,
                { transformOrigin: '50% 50%', rotate: baseRotation },
                {
                    ease: 'none',
                    rotate: 0,
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: 'top bottom',
                        end: rotationEnd,
                        scrub: true
                    }
                }
            );

            let targets: any = el.querySelectorAll('.word');
            if (targets.length === 0) {
                const textContainer = el.querySelector('.scroll-reveal-text');
                if (textContainer && textContainer.children.length > 0) {
                    targets = textContainer.children;
                } else {
                    targets = el;
                }
            }

            // Opacity and Blur animations
            gsap.fromTo(
                targets,
                {
                    opacity: baseOpacity,
                    filter: enableBlur ? `blur(${blurStrength}px)` : 'none'
                },
                {
                    ease: 'none',
                    opacity: 1,
                    filter: 'blur(0px)',
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: 'top bottom-=10%',
                        end: wordAnimationEnd,
                        scrub: true
                    }
                }
            );
        }, containerRef);

        // Refresh ScrollTrigger after a short delay to account for layout shifts
        const timeoutId = setTimeout(() => ScrollTrigger.refresh(), 100);

        return () => {
            ctx.revert(); // Clean up all GSAP animations/triggers
            clearTimeout(timeoutId);
        };
    }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength, children]);

    return (
        <div ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
            <div className={`scroll-reveal-text ${textClassName}`}>{splitText}</div>
        </div>
    );
};

export default ScrollReveal;
