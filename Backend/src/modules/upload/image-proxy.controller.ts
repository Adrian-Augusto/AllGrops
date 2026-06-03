import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { Stream } from 'stream';

@Controller('images')
export class ImagesController {
  @Get('proxy')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return this.returnPlaceholder(res);
    }

    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return this.returnPlaceholder(res);
      }

      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const contentTypeHeader = response.headers['content-type'];
      const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'image/jpeg';
      
      if (!contentType.startsWith('image/')) {
        return this.returnPlaceholder(res);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      (response.data as Stream).pipe(res);
    } catch (error: any) {
      console.error('Error proxying image:', url, error?.message || error);
      return this.returnPlaceholder(res);
    }
  }

  private returnPlaceholder(res: Response) {
    const svgPlaceholder = `
      <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
        <rect width="100%" height="100%" fill="#f1f3f5"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#adb5bd">
          Sem Imagem
        </text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(HttpStatus.OK).send(svgPlaceholder.trim());
  }
}
