'use client'

import React, { useCallback, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { toast } from 'sonner'
import {v4 as uuidv4} from 'uuid';
import { Loader2, Trash2 } from 'lucide-react';

const Uploader = () => {
  const [files, setFiles] = useState<
    Array<{
      id: string;
      file: File;
      uploading: boolean;
      progress: number;
      key?: string;
      isDeleting: boolean;
      error: boolean;
      objectUrl?: string;
    }>
  >([]);

  async function removeFile(FileId: string) {
    try {
      const fileToRemove = files.find((f) => f.id === FileId);

      //Remove file object from memory = No memory leaks
      if(fileToRemove) {
        if(fileToRemove.objectUrl) {
          URL.revokeObjectURL(fileToRemove.objectUrl);
        }
      }
      
      setFiles((prevFiles) => 
        prevFiles.map((file) => 
          file.id === FileId ? { ...file, isDeleting: true } : file
        )
      );

      const deleteResponse = await fetch('/api/s3/delete', {
        method: 'DELETE',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          key: fileToRemove?.key
        })
      });

      if(!deleteResponse.ok) {
        toast.error('Failed to delete file');

        setFiles((prevFiles) => 
          prevFiles.map((file) => 
            file.id === FileId ? { ...file, isDeleting: false, error: true } : file
          )
        );

        return;
      }

      setFiles((prevFiles) => 
        prevFiles.map((file) => 
          file.id === FileId ? { ...file, isDeleting: false, error: false } : file
        )
      );

      toast.success('File deleted successfully');
    } catch {
      toast.error('File deletion failed');

      setFiles((prevFiles) => 
        prevFiles.map((file) => 
          file.id === FileId ? { ...file, isDeleting: false, error: true } : file
        )
      );
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length) {
      setFiles((prevFiles) => [
        ...prevFiles,
        ...acceptedFiles.map((file) => ({
          id: uuidv4(),
          file,
          uploading: false,
          progress: 0,
          isDeleting: false,
          error: false,
          objectUrl: URL.createObjectURL(file),
        })),
      ]);
    }

    acceptedFiles.forEach(uploadFile)
  }, []);

  async function uploadFile(specificFile: File) {
    setFiles((prevFiles) => 
      prevFiles.map((file) => 
        file.file === specificFile ? { ...file, uploading: true } : file
      )
    );

    try {
      const presignedUrlResponse = await fetch("api/s3/upload", {
        method: "POST",
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          fileName: specificFile.name,
          contentType: specificFile.type,
          size: specificFile.size
        })
      })

      if (!presignedUrlResponse.ok) {
        toast.error('Failed to get presigned URL');

        setFiles((prevFiles) => 
          prevFiles.map((file) => 
            file.file === specificFile ? { ...file, uploading: false, progress: 0, error: true } : file
          )
        );

        return;
      }

      const { presignedUrl, key } = await presignedUrlResponse.json();
      
      //Progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          //Do we have total size of file
          if (event.lengthComputable) {
            //Calculate percentage completed
            const percentageCompleted = (event.loaded / event.total) * 100;

            setFiles((prevFiles) => 
              prevFiles.map((file) => 
                file.file === specificFile 
                  ? { ...file, progress: Math.round(percentageCompleted), key: key } : file
              )
            ); 
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 || xhr.status == 204) {
            setFiles((prevFiles) => 
              prevFiles.map((file) => 
                file.file === specificFile 
                  ? { ...file, progress: 100, uploading: false, error: false} : file
              )
            ); 

            toast.success('File uploaded successfully');

            resolve();
          } else {
            reject(new Error('Upload failed with status ' + xhr.status));
          }
        }

        xhr.onerror = () => {
          reject(new Error('Upload failed'));
        }
        
        //Make request
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader('Content-Type', specificFile.type);
        xhr.send(specificFile);
      });     
    } catch {
      toast.error('File upload failed');

      //Set error state
      setFiles((prevFiles) => 
        prevFiles.map((file) => 
          file.file === specificFile 
            ? { ...file, progress: 0, uploading: false, error: true} : file
        )
      ); 
    }
  }

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if(fileRejections.length > 0) {
      const tooManyFiles = fileRejections.find(
        (fileRejection) => fileRejection.errors[0].code === 'too-many-files');
      
        const fileTooLarge = fileRejections.find(
        (fileRejection) => fileRejection.errors[0].code === 'file-too-large');
      
        const invalidFileType = fileRejections.find(
        (fileRejection) => fileRejection.errors[0].code === 'file-invalid-type');
      
      if (tooManyFiles) {
        toast.error('You can only upload one file at a time.');
      }
     
      if (fileTooLarge) {
        toast.error('The file is too large. Maximum size is 10MB.');
      }

      if (invalidFileType) {
        toast.error('Invalid file type. Please upload an Excel file (.xls or .xlsx).');
      }
    }
  }, [])
  
  const {getRootProps, getInputProps, isDragActive} = useDropzone({ 
    onDrop,
    onDropRejected,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 10, // 10 MB
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    }
  });

   return (
    <>
      <Card className={cn('relative border-2 border-dashed duration-200 ease-in-out w-full h-64', isDragActive ? 'border-primary bg-primary/10 border-solid': 'border-border bg-black-200 hover:border-primary')} {...getRootProps()}>
        <CardContent className="flex flex-col justify-center items-center h-full">
          <input {...getInputProps()} />
          {
            isDragActive ?
              <p>Drop the files here ...</p> :
              <div className="flex flex-col items-center justify-center h-full w-full gap-y-3">
                <p>Drag 'n' drop some files here, or click to select files</p>
                <Button>Select Files</Button>
              </div>
          }
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm-grid-cols-3 md:grid-cols-4 mt-6">
        {files.map((file) =>  (
          <div key={file.id}>
            <img src={file.objectUrl} alt={file.file.name}/>

            <Button variant="destructive" size="icon" className="absolute top-2 right-2" disabled={file.uploading || file.isDeleting} onClick={() => removeFile(file.id)}>
              {file.isDeleting ? (
                <Loader2 className="animate-spin" />
              ): (
                <Trash2 className="size-4"/>
              )}
            </Button>

            {file.uploading && !file.isDeleting && (
              <p className="text-white- ">{file.progress}%</p>
            )}

            {file.error && (
              <p className="text-red-500">Upload failed</p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default Uploader
