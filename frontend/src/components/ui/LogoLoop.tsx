'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './LogoLoop.module.css';

type LogoEntry = {
    src?: string;
    alt?: string;
    node?: ReactNode;
    title?: string;
    href?: string;
};

type LogoLoopProps = {
    logos: LogoEntry[];
    speed?: number;
    hoverSpeed?: number;
    direction?: 'left' | 'right';
    logoHeight?: number;
    gap?: number;
    scaleOnHover?: boolean;
    fadeOut?: boolean;
    fadeOutColor?: string;
    ariaLabel?: string;
    className?: string;
    useCustomRender?: boolean;
    renderLogo?: (logo: LogoEntry, index: number) => ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export default function LogoLoop({
    logos,
    speed = 100,
    hoverSpeed = 0,
    direction = 'left',
    logoHeight = 60,
    gap = 60,
    scaleOnHover = false,
    fadeOut = false,
    fadeOutColor = '#ffffff',
    ariaLabel = 'Logo loop',
    className,
    useCustomRender = false,
    renderLogo,
}: LogoLoopProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const segmentRef = useRef<HTMLDivElement>(null);

    const [containerWidth, setContainerWidth] = useState(0);
    const [segmentWidth, setSegmentWidth] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const containerEl = containerRef.current;
        const segmentEl = segmentRef.current;
        if (!containerEl || !segmentEl) return;

        const measure = () => {
            setContainerWidth(containerEl.getBoundingClientRect().width);
            setSegmentWidth(segmentEl.getBoundingClientRect().width);
        };

        measure();

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(containerEl);
        resizeObserver.observe(segmentEl);

        return () => resizeObserver.disconnect();
    }, [logos, gap, logoHeight, useCustomRender, renderLogo]);

    const safeSpeed = Math.max(speed, 1);
    const safeHoverSpeed = Math.max(hoverSpeed, 0);

    const baseDuration = useMemo(() => {
        if (segmentWidth <= 0) return 20;
        return segmentWidth / safeSpeed;
    }, [segmentWidth, safeSpeed]);

    const hoveredDuration = useMemo(() => {
        if (segmentWidth <= 0 || safeHoverSpeed <= 0) return baseDuration;
        return segmentWidth / safeHoverSpeed;
    }, [baseDuration, segmentWidth, safeHoverSpeed]);

    const copies = useMemo(() => {
        if (segmentWidth <= 0 || containerWidth <= 0) return 2;
        return Math.max(2, Math.ceil(1 + containerWidth / segmentWidth));
    }, [containerWidth, segmentWidth]);

    const playState = isHovered && safeHoverSpeed === 0 ? 'paused' : 'running';
    const animationDuration = isHovered && safeHoverSpeed > 0 ? hoveredDuration : baseDuration;

    const trackStyle = {
        '--logo-loop-distance': `${segmentWidth}px`,
        animationDuration: `${animationDuration}s`,
        animationPlayState: playState,
    } as CSSProperties;

    const containerStyle = {
        '--logo-loop-fade-color': fadeOutColor,
    } as CSSProperties;

    const renderDefaultLogo = (logo: LogoEntry) => {
        if (logo.node) {
            return (
                <span style={{ fontSize: `${logoHeight}px`, lineHeight: 1, display: 'inline-flex' }}>
                    {logo.node}
                </span>
            );
        }

        if (logo.src) {
            return (
                <img
                    src={logo.src}
                    alt={logo.alt ?? logo.title ?? 'Logo'}
                    style={{ height: `${logoHeight}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
                />
            );
        }

        return <span>{logo.title ?? logo.alt ?? 'Logo'}</span>;
    };

    return (
        <div
            ref={containerRef}
            className={cx(styles.container, fadeOut && styles.fadeOut, className)}
            style={containerStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={cx(styles.track, direction === 'left' ? styles.trackLeft : styles.trackRight)}
                style={trackStyle}
                role="list"
                aria-label={ariaLabel}
            >
                {Array.from({ length: copies }).map((_, copyIndex) => (
                    <div
                        key={`logo-segment-${copyIndex}`}
                        ref={copyIndex === 0 ? segmentRef : undefined}
                        className={styles.segment}
                        style={{ columnGap: `${gap}px` }}
                        aria-hidden={copyIndex > 0}
                    >
                        {logos.map((logo, logoIndex) => {
                            const content =
                                useCustomRender && renderLogo ? renderLogo(logo, logoIndex) : renderDefaultLogo(logo);

                            if (logo.href) {
                                return (
                                    <a
                                        key={`logo-item-${copyIndex}-${logo.title ?? logo.alt ?? logoIndex}`}
                                        href={logo.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cx(styles.item, scaleOnHover && styles.itemScale)}
                                        aria-label={logo.title ?? logo.alt ?? 'Logo link'}
                                    >
                                        {content}
                                    </a>
                                );
                            }

                            return (
                                <div
                                    key={`logo-item-${copyIndex}-${logo.title ?? logo.alt ?? logoIndex}`}
                                    className={cx(styles.item, scaleOnHover && styles.itemScale)}
                                    role="listitem"
                                >
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
